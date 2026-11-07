package project

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"storytoon/internal/constants"
	"storytoon/internal/handler/response"
	"storytoon/internal/logger"
)

type summaryResponse struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	Status       string    `json:"status"`
	AspectRatio  string    `json:"aspectRatio"`
	VideoType    string    `json:"videoType"`
	DurationMs   int       `json:"durationMs"`
	CreatedAt    time.Time `json:"createdAt"`
	ThumbnailURL *string   `json:"thumbnailUrl"`
}

// List handles GET /projects.
func (h Handler) List(c *gin.Context) {
	items, err := h.ctrl.List(c.Request.Context())
	if err != nil {
		logger.ERROR.Printf("[ProjectList] failed: %+v", err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
		return
	}
	res := make([]summaryResponse, 0, len(items))
	for _, p := range items {
		res = append(res, summaryResponse{
			ID: p.ID, Title: p.Title, Status: p.Status, AspectRatio: p.AspectRatio,
			VideoType: p.VideoType, DurationMs: p.DurationMs, CreatedAt: p.CreatedAt,
			ThumbnailURL: p.ThumbnailURL,
		})
	}
	logger.INFO.Printf("[ProjectList] returned %d projects", len(res))
	c.JSON(http.StatusOK, response.NewResponse(constants.Success.Code, constants.Success.Message, res))
}
