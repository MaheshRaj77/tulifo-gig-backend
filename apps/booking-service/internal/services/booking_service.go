package services

import (
	"context"
	"errors"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"booking-service/internal/models"
)

type BookingService struct {
	db *pgxpool.Pool
}

func NewBookingService() *BookingService {
	dbURL := os.Getenv("DATABASE_URL")
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		panic(err)
	}

	return &BookingService{db: pool}
}

func (s *BookingService) CreateBooking(ctx context.Context, clientID string, req *models.CreateBookingRequest) (*models.Booking, error) {
	id := uuid.New().String()
	now := time.Now()

	duration := int(req.EndTime.Sub(req.StartTime).Minutes())
	totalAmount := float64(duration) / 60.0 * req.HourlyRate

	booking := &models.Booking{
		ID:          id,
		WorkerID:    req.WorkerID,
		ClientID:    clientID,
		ProjectID:   req.ProjectID,
		Title:       req.Title,
		Description: req.Description,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		Duration:    duration,
		HourlyRate:  req.HourlyRate,
		TotalAmount: totalAmount,
		Currency:    "USD",
		Status:      "pending",
		Notes:       req.Notes,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	_, err := s.db.Exec(ctx, `
		INSERT INTO bookings (id, worker_id, client_id, project_id, title, description, start_time, end_time, duration, hourly_rate, total_amount, currency, status, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`, booking.ID, booking.WorkerID, booking.ClientID, booking.ProjectID, booking.Title, booking.Description, booking.StartTime, booking.EndTime, booking.Duration, booking.HourlyRate, booking.TotalAmount, booking.Currency, booking.Status, booking.Notes, booking.CreatedAt, booking.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return booking, nil
}

func (s *BookingService) GetUserBookings(ctx context.Context, userID string, role string) ([]*models.Booking, error) {
	var query string
	if role == "worker" {
		query = "SELECT * FROM bookings WHERE worker_id = $1 ORDER BY start_time DESC"
	} else {
		query = "SELECT * FROM bookings WHERE client_id = $1 ORDER BY start_time DESC"
	}

	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []*models.Booking
	for rows.Next() {
		b := &models.Booking{}
		err := rows.Scan(&b.ID, &b.WorkerID, &b.ClientID, &b.ProjectID, &b.Title, &b.Description, &b.StartTime, &b.EndTime, &b.Duration, &b.HourlyRate, &b.TotalAmount, &b.Currency, &b.Status, &b.MeetingURL, &b.Notes, &b.CreatedAt, &b.UpdatedAt)
		if err != nil {
			continue
		}
		bookings = append(bookings, b)
	}

	return bookings, nil
}

func (s *BookingService) GetBookingByID(ctx context.Context, id string, userID string) (*models.Booking, error) {
	b := &models.Booking{}
	err := s.db.QueryRow(ctx, `
		SELECT id, worker_id, client_id, project_id, title, description, start_time, end_time, duration, hourly_rate, total_amount, currency, status, meeting_url, notes, created_at, updated_at
		FROM bookings WHERE id = $1 AND (worker_id = $2 OR client_id = $2)
	`, id, userID).Scan(&b.ID, &b.WorkerID, &b.ClientID, &b.ProjectID, &b.Title, &b.Description, &b.StartTime, &b.EndTime, &b.Duration, &b.HourlyRate, &b.TotalAmount, &b.Currency, &b.Status, &b.MeetingURL, &b.Notes, &b.CreatedAt, &b.UpdatedAt)

	if err != nil {
		return nil, errors.New("booking not found")
	}

	return b, nil
}

func (s *BookingService) UpdateBooking(ctx context.Context, id string, userID string, req *models.UpdateBookingRequest) (*models.Booking, error) {
	booking, err := s.GetBookingByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	if booking.Status != "pending" {
		return nil, errors.New("can only update pending bookings")
	}

	_, err = s.db.Exec(ctx, `
		UPDATE bookings SET title = COALESCE($1, title), description = COALESCE($2, description), notes = COALESCE($3, notes), updated_at = $4 WHERE id = $5
	`, req.Title, req.Description, req.Notes, time.Now(), id)

	if err != nil {
		return nil, err
	}

	return s.GetBookingByID(ctx, id, userID)
}

func (s *BookingService) ConfirmBooking(ctx context.Context, id string, userID string) (*models.Booking, error) {
	booking, err := s.GetBookingByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	if booking.WorkerID != userID {
		return nil, errors.New("only worker can confirm booking")
	}

	if booking.Status != "pending" {
		return nil, errors.New("can only confirm pending bookings")
	}

	_, err = s.db.Exec(ctx, "UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3", "confirmed", time.Now(), id)
	if err != nil {
		return nil, err
	}

	return s.GetBookingByID(ctx, id, userID)
}

func (s *BookingService) CancelBooking(ctx context.Context, id string, userID string, reason string) (*models.Booking, error) {
	booking, err := s.GetBookingByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	if booking.Status == "completed" || booking.Status == "cancelled" {
		return nil, errors.New("cannot cancel this booking")
	}

	_, err = s.db.Exec(ctx, "UPDATE bookings SET status = $1, notes = CONCAT(notes, ' | Cancelled: ', $2), updated_at = $3 WHERE id = $4", "cancelled", reason, time.Now(), id)
	if err != nil {
		return nil, err
	}

	return s.GetBookingByID(ctx, id, userID)
}

func (s *BookingService) CompleteBooking(ctx context.Context, id string, userID string) (*models.Booking, error) {
	booking, err := s.GetBookingByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	if booking.Status != "confirmed" && booking.Status != "in_progress" {
		return nil, errors.New("can only complete confirmed or in-progress bookings")
	}

	_, err = s.db.Exec(ctx, "UPDATE bookings SET status = $1, updated_at = $2 WHERE id = $3", "completed", time.Now(), id)
	if err != nil {
		return nil, err
	}

	return s.GetBookingByID(ctx, id, userID)
}
