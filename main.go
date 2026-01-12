package main

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/routes"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	database.InitDB()

	// Setup Gin router
	r := gin.Default()

	// Health check endpoint
	r.GET("/health", routes.HealthCheck)

	// API routes
	routes.SetupQuestionsRoutes(r)

	log.Println("Server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
