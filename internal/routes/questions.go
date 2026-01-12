package routes

import (
	"diploma-ent-mvp/internal/handlers"

	"github.com/gin-gonic/gin"
)

func SetupQuestionsRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/questions", handlers.GetRandomQuestion)
		api.POST("/answer", handlers.SubmitAnswer)
		api.GET("/progress/:user_id", handlers.GetProgress)
	}
}

