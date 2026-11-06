package server

import (
	"net/http"

	"github.com/gin-gonic/gin"

	projecthandler "storytoon/internal/handler/rest/v1/project"
	scenehandler "storytoon/internal/handler/rest/v1/scene"
)

func registerRoutes(r *gin.Engine, cfg Config, ph projecthandler.Handler, sh scenehandler.Handler) {
	r.Use(cors())
	r.MaxMultipartMemory = 32 << 20
	r.Static("/media", cfg.StorageDir)

	v1 := r.Group("/api/v1")
	v1.GET("/projects", ph.List)
	v1.POST("/projects", ph.Create)
	v1.GET("/projects/:id", ph.Get)
	v1.DELETE("/projects/:id", ph.Delete)
	v1.POST("/projects/:id/process", ph.Process)
	v1.PUT("/projects/:id/voiceover", ph.UpdateVoiceover)
	v1.PATCH("/projects/:id/voiceover", ph.UpdateVoiceover)
	v1.PUT("/projects/:id/scenes", ph.SaveScenes)
	v1.POST("/projects/:id/scenes", ph.SaveScenes)
	v1.PATCH("/scenes/:id", sh.Update)
	v1.POST("/scenes/:id/image", sh.UploadImage)
	v1.POST("/scenes/:id/generate-image", sh.GenerateImage)
}

func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
