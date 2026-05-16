package routes

import (
	"diploma-ent-mvp/internal/handlers"
	"diploma-ent-mvp/internal/middleware"

	"github.com/gin-gonic/gin"
)

func SetupQuestionsRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/questions", handlers.GetRandomQuestion)
		api.POST("/answer", handlers.SubmitAnswer)
		api.GET("/progress/:user_id", handlers.GetProgress)
		api.GET("/dashboard/:user_id", handlers.GetDashboard)
		api.GET("/prediction/:user_id", handlers.GetPrediction)
		api.POST("/ai-feedback", handlers.GetAIFeedback)
		api.POST("/ai-chat", handlers.ChatWithAI)
		api.GET("/ai/weekly-plan/:user_id", handlers.GetWeeklyAIPlan)

		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.GET("/me", middleware.AuthRequired(), handlers.Me)
		}

		api.GET("/profile", middleware.AuthRequired(), handlers.GetProfile)
		api.PUT("/profile", middleware.AuthRequired(), handlers.PutProfile)
	}
}
