package models

import "time"

type Booking struct {
	ID          string    `json:"id"`
	WorkerID    string    `json:"workerId"`
	ClientID    string    `json:"clientId"`
	ProjectID   *string   `json:"projectId,omitempty"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	Duration    int       `json:"duration"`
	HourlyRate  float64   `json:"hourlyRate"`
	TotalAmount float64   `json:"totalAmount"`
	Currency    string    `json:"currency"`
	Status      string    `json:"status"`
	MeetingURL  *string   `json:"meetingUrl,omitempty"`
	Notes       *string   `json:"notes,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateBookingRequest struct {
	WorkerID    string    `json:"workerId" binding:"required"`
	ProjectID   *string   `json:"projectId"`
	Title       string    `json:"title" binding:"required"`
	Description string    `json:"description"`
	StartTime   time.Time `json:"startTime" binding:"required"`
	EndTime     time.Time `json:"endTime" binding:"required"`
	HourlyRate  float64   `json:"hourlyRate" binding:"required"`
	Notes       *string   `json:"notes"`
}

type UpdateBookingRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Notes       *string `json:"notes"`
}

type AvailabilitySlot struct {
	DayOfWeek   int    `json:"dayOfWeek"`
	StartTime   string `json:"startTime"`
	EndTime     string `json:"endTime"`
	IsRecurring bool   `json:"isRecurring"`
}

type TimeSlot struct {
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	IsAvailable bool      `json:"isAvailable"`
}

type BlockedSlot struct {
	ID        string    `json:"id"`
	StartTime time.Time `json:"startTime" binding:"required"`
	EndTime   time.Time `json:"endTime" binding:"required"`
	Reason    string    `json:"reason"`
}
