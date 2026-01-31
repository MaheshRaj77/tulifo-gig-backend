package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"booking-service/internal/handlers"
	"booking-service/internal/middleware"
	"booking-service/internal/services"
)

func main() {
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3007"
	}

	// Initialize services
	bookingService := services.NewBookingService()
	availabilityService := services.NewAvailabilityService()

	// Initialize handlers
	bookingHandler := handlers.NewBookingHandler(bookingService)
	availabilityHandler := handlers.NewAvailabilityHandler(availabilityService)

	// Setup router
	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "booking-service"})
	})

	// API routes
	api := r.Group("/api")
	{
		bookings := api.Group("/bookings")
		bookings.Use(middleware.AuthMiddleware())
		{
			bookings.POST("", bookingHandler.CreateBooking)
			bookings.GET("", bookingHandler.GetUserBookings)
			bookings.GET("/:id", bookingHandler.GetBooking)
			bookings.PUT("/:id", bookingHandler.UpdateBooking)
			bookings.POST("/:id/confirm", bookingHandler.ConfirmBooking)
			bookings.POST("/:id/cancel", bookingHandler.CancelBooking)
			bookings.POST("/:id/complete", bookingHandler.CompleteBooking)
		}

		availability := api.Group("/availability")
		{
			availability.GET("/worker/:workerId", availabilityHandler.GetWorkerAvailability)
			availability.GET("/worker/:workerId/slots", availabilityHandler.GetAvailableSlots)
			availability.Use(middleware.AuthMiddleware())
			availability.PUT("/worker/:workerId", availabilityHandler.UpdateAvailability)
			availability.POST("/worker/:workerId/block", availabilityHandler.BlockTimeSlot)
			availability.DELETE("/worker/:workerId/block/:slotId", availabilityHandler.UnblockTimeSlot)
		}
	}

	log.Printf("Booking service running on port %s", port)
	r.Run(":" + port)
}
