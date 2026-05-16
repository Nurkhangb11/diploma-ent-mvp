package main

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/routes"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load OPENAI_API_KEY from .env in project root (optional file).
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file (OPENAI_API_KEY must be set in environment to enable AI)")
	}

	// Initialize database
	database.InitDB()

	// Setup Gin router
	r := gin.Default()

	// Health check endpoint
	r.GET("/health", routes.HealthCheck)

	// API routes
	routes.SetupQuestionsRoutes(r)

	if os.Getenv("OPENAI_API_KEY") != "" {
		log.Println("OpenAI: configured")
	} else {
		log.Println("OpenAI: not configured — create .env from .env.example and set OPENAI_API_KEY")
	}

	log.Println("Server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
