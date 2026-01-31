package services

import (
	"context"
	"encoding/json"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"booking-service/internal/models"
)

type AvailabilityService struct {
	db *pgxpool.Pool
}

func NewAvailabilityService() *AvailabilityService {
	dbURL := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		panic(err)
	}

	return &AvailabilityService{db: pool}
}

func (s *AvailabilityService) GetWorkerAvailability(ctx context.Context, workerID string) ([]models.AvailabilitySlot, error) {
	var availabilityJSON []byte
	err := s.db.QueryRow(ctx, "SELECT availability FROM worker_profiles WHERE user_id = $1", workerID).Scan(&availabilityJSON)
	if err != nil {
		return nil, err
	}

	var slots []models.AvailabilitySlot
	json.Unmarshal(availabilityJSON, &slots)

	return slots, nil
}

func (s *AvailabilityService) GetAvailableSlots(ctx context.Context, workerID string, date time.Time, durationMinutes int) ([]models.TimeSlot, error) {
	// Get worker's recurring availability
	availability, err := s.GetWorkerAvailability(ctx, workerID)
	if err != nil {
		return nil, err
	}

	dayOfWeek := int(date.Weekday())

	// Get existing bookings for the day
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	rows, err := s.db.Query(ctx, `
		SELECT start_time, end_time FROM bookings 
		WHERE worker_id = $1 AND start_time >= $2 AND end_time <= $3 AND status NOT IN ('cancelled')
	`, workerID, startOfDay, endOfDay)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookedSlots []models.TimeSlot
	for rows.Next() {
		var slot models.TimeSlot
		rows.Scan(&slot.StartTime, &slot.EndTime)
		bookedSlots = append(bookedSlots, slot)
	}

	// Get blocked slots
	blockedRows, _ := s.db.Query(ctx, `
		SELECT start_time, end_time FROM blocked_slots 
		WHERE worker_id = $1 AND start_time >= $2 AND end_time <= $3
	`, workerID, startOfDay, endOfDay)
	defer blockedRows.Close()

	for blockedRows.Next() {
		var slot models.TimeSlot
		blockedRows.Scan(&slot.StartTime, &slot.EndTime)
		bookedSlots = append(bookedSlots, slot)
	}

	// Generate available slots
	var availableSlots []models.TimeSlot

	for _, avail := range availability {
		if avail.DayOfWeek != dayOfWeek {
			continue
		}

		startHour, startMin := parseTimeString(avail.StartTime)
		endHour, endMin := parseTimeString(avail.EndTime)

		slotStart := time.Date(date.Year(), date.Month(), date.Day(), startHour, startMin, 0, 0, date.Location())
		slotEnd := time.Date(date.Year(), date.Month(), date.Day(), endHour, endMin, 0, 0, date.Location())

		// Generate slots at intervals
		for current := slotStart; current.Add(time.Duration(durationMinutes)*time.Minute).Before(slotEnd) || current.Add(time.Duration(durationMinutes)*time.Minute).Equal(slotEnd); current = current.Add(30 * time.Minute) {
			proposedEnd := current.Add(time.Duration(durationMinutes) * time.Minute)

			// Check if slot conflicts with any booked slots
			isAvailable := true
			for _, booked := range bookedSlots {
				if !(proposedEnd.Before(booked.StartTime) || proposedEnd.Equal(booked.StartTime) || current.After(booked.EndTime) || current.Equal(booked.EndTime)) {
					isAvailable = false
					break
				}
			}

			if isAvailable {
				availableSlots = append(availableSlots, models.TimeSlot{
					StartTime:   current,
					EndTime:     proposedEnd,
					IsAvailable: true,
				})
			}
		}
	}

	return availableSlots, nil
}

func (s *AvailabilityService) UpdateAvailability(ctx context.Context, workerID string, slots []models.AvailabilitySlot) error {
	slotsJSON, _ := json.Marshal(slots)
	_, err := s.db.Exec(ctx, "UPDATE worker_profiles SET availability = $1 WHERE user_id = $2", slotsJSON, workerID)
	return err
}

func (s *AvailabilityService) BlockTimeSlot(ctx context.Context, workerID string, req *models.BlockedSlot) (*models.BlockedSlot, error) {
	id := uuid.New().String()
	req.ID = id

	_, err := s.db.Exec(ctx, `
		INSERT INTO blocked_slots (id, worker_id, start_time, end_time, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, id, workerID, req.StartTime, req.EndTime, req.Reason, time.Now())

	if err != nil {
		return nil, err
	}

	return req, nil
}

func (s *AvailabilityService) UnblockTimeSlot(ctx context.Context, workerID string, slotID string) error {
	_, err := s.db.Exec(ctx, "DELETE FROM blocked_slots WHERE id = $1 AND worker_id = $2", slotID, workerID)
	return err
}

func parseTimeString(t string) (int, int) {
	var hour, min int
	fmt.Sscanf(t, "%d:%d", &hour, &min)
	return hour, min
}
