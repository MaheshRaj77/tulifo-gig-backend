package handlers

import (
	"fmt"
	"net/http"
	"time"

	"booking-service/internal/models"
	"booking-service/internal/services"

	"github.com/gin-gonic/gin"
)

type AvailabilityHandler struct {
	service *services.AvailabilityService
}

func NewAvailabilityHandler(service *services.AvailabilityService) *AvailabilityHandler {
	return &AvailabilityHandler{service: service}
}

func (h *AvailabilityHandler) GetWorkerAvailability(c *gin.Context) {
	workerID := c.Param("workerId")

	availability, err := h.service.GetWorkerAvailability(c.Request.Context(), workerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "FETCH_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": availability})
}

func (h *AvailabilityHandler) GetAvailableSlots(c *gin.Context) {
	workerID := c.Param("workerId")
	dateStr := c.Query("date")
	durationStr := c.DefaultQuery("duration", "60")

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": gin.H{"code": "INVALID_DATE", "message": "Invalid date format"}})
		return
	}

	var duration int
	if _, err := fmt.Sscanf(durationStr, "%d", &duration); err != nil {
		duration = 60
	}

	slots, err := h.service.GetAvailableSlots(c.Request.Context(), workerID, date, duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "FETCH_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": slots})
}

func (h *AvailabilityHandler) UpdateAvailability(c *gin.Context) {
	userID := c.GetString("userId")
	workerID := c.Param("workerId")

	if userID != workerID {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": gin.H{"code": "FORBIDDEN", "message": "Not authorized"}})
		return
	}

	var req []models.AvailabilitySlot
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	err := h.service.UpdateAvailability(c.Request.Context(), workerID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "UPDATE_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Availability updated"})
}

func (h *AvailabilityHandler) BlockTimeSlot(c *gin.Context) {
	userID := c.GetString("userId")
	workerID := c.Param("workerId")

	if userID != workerID {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": gin.H{"code": "FORBIDDEN", "message": "Not authorized"}})
		return
	}

	var req models.BlockedSlot
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()}})
		return
	}

	slot, err := h.service.BlockTimeSlot(c.Request.Context(), workerID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "BLOCK_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": slot})
}

func (h *AvailabilityHandler) UnblockTimeSlot(c *gin.Context) {
	userID := c.GetString("userId")
	workerID := c.Param("workerId")
	slotID := c.Param("slotId")

	if userID != workerID {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "error": gin.H{"code": "FORBIDDEN", "message": "Not authorized"}})
		return
	}

	err := h.service.UnblockTimeSlot(c.Request.Context(), workerID, slotID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"code": "UNBLOCK_FAILED", "message": err.Error()}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Time slot unblocked"})
}
