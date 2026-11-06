package project

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"storytoon/internal/constants"
	ctrl "storytoon/internal/controller/project"
	"storytoon/internal/handler/response"
	"storytoon/internal/logger"
)

type updateVoiceoverRequest struct {
	Script        *string         `json:"script"`
	AudioURL      string          `json:"audioUrl" binding:"required"`
	CaptionSrtURL *string         `json:"captionSrtUrl"`
	CaptionVttURL *string         `json:"captionVttUrl"`
	DurationMs    int             `json:"durationMs" binding:"required,gt=0"`
	Words         json.RawMessage `json:"words"`
	Status        string          `json:"status"`
}

// UpdateVoiceover handles PUT /projects/:id/voiceover and PATCH /projects/:id/voiceover.
func (h Handler) UpdateVoiceover(c *gin.Context) {
	id := c.Param("id")
	var req updateVoiceoverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.ERROR.Printf("[ProjectUpdateVoiceover] invalid body for project %s: %+v", id, err)
		c.JSON(http.StatusBadRequest, response.NewResponse(constants.InvalidRequest.Code, constants.InvalidRequest.Message, nil))
		return
	}

	out, err := h.ctrl.UpdateVoiceover(c.Request.Context(), id, ctrl.UpdateVoiceoverInput{
		Script:        req.Script,
		AudioURL:      req.AudioURL,
		CaptionSrtURL: req.CaptionSrtURL,
		CaptionVttURL: req.CaptionVttURL,
		DurationMs:    req.DurationMs,
		Words:         req.Words,
		Status:        req.Status,
	})
	switch {
	case errors.Is(err, ctrl.ErrNotFound):
		logger.ERROR.Printf("[ProjectUpdateVoiceover] project not found: %s", id)
		c.JSON(http.StatusNotFound, response.NewResponse(constants.NotFound.Code, constants.NotFound.Message, nil))
	case err != nil:
		logger.ERROR.Printf("[ProjectUpdateVoiceover] failed for project %s: %+v", id, err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
	default:
		logger.INFO.Printf("[ProjectUpdateVoiceover] updated voiceover for project %s (durationMs=%d)", id, out.DurationMs)
		c.JSON(http.StatusOK, response.NewResponse(constants.Success.Code, constants.Success.Message, toProjectResponse(out)))
	}
}
