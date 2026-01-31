package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"booking-service/internal/services"
	"booking-service/internal/models"
)

type BookingHandler struct {
	service *services.BookingService
}

func NewBookingHandler(service *services.BookingService) *BookingHandler {
	return &BookingHandler{service: service}
}

func (h *BookingHandler) CreateBooking(c *gin.Context) {
	userID := c.GetString("userId")

	var req models.CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	booking, err := h.service.CreateBooking(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "CREATE_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": booking})
}

func (h *BookingHandler) GetUserBookings(c *gin.Context) {
	userID := c.GetString("userId")
	role := c.Query("role") // "worker" or "client"

	bookings, err := h.service.GetUserBookings(c.Request.Context(), userID, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "FETCH_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": bookings})
}

func (h *BookingHandler) GetBooking(c *gin.Context) {
	userID := c.GetString("userId")
	bookingID := c.Param("id")

	booking, err := h.service.GetBookingByID(c.Request.Context(), bookingID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": gin.H{"code": "NOT_FOUND", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": booking})
}

func (h *BookingHandler) UpdateBooking(c *gin.Context) {
	userID := c.GetString("userId")
	bookingID := c.Param("id")

	var req models.UpdateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	booking, err := h.service.UpdateBooking(c.Request.Context(), bookingID, userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "UPDATE_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": booking})
}

func (h *BookingHandler) ConfirmBooking(c *gin.Context) {
	userID := c.GetString("userId")
	bookingID := c.Param("id")

	booking, err := h.service.ConfirmBooking(c.Request.Context(), bookingID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "CONFIRM_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": booking})
}

func (h *BookingHandler) CancelBooking(c *gin.Context) {
	userID := c.GetString("userId")
	bookingID := c.Param("id")

	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)

	booking, err := h.service.CancelBooking(c.Request.Context(), bookingID, userID, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "CANCEL_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": booking})
}

func (h *BookingHandler) CompleteBooking(c *gin.Context) {
	userID := c.GetString("userId")
	bookingID := c.Param("id")

	booking, err := h.service.CompleteBooking(c.Request.Context(), bookingID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "COMPLETE_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": booking})
}
