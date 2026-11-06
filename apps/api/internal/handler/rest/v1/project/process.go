package project

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"storytoon/internal/constants"
	ctrl "storytoon/internal/controller/project"
	"storytoon/internal/handler/response"
	"storytoon/internal/logger"
)

type processRequest struct {
	VoiceID string `json:"voiceId"`
}

// Process handles POST /projects/:id/process (starts voice + captions + scene breakdown).
func (h Handler) Process(c *gin.Context) {
	id := c.Param("id")
	var req processRequest
	_ = c.ShouldBindJSON(&req)
	err := h.ctrl.Process(c.Request.Context(), id, req.VoiceID)
	switch {
	case errors.Is(err, ctrl.ErrNotFound):
		logger.ERROR.Printf("[ProjectProcess] not found: %s", id)
		c.JSON(http.StatusNotFound, response.NewResponse(constants.NotFound.Code, constants.NotFound.Message, nil))
	case errors.Is(err, ctrl.ErrBusy):
		logger.ERROR.Printf("[ProjectProcess] busy: %s", id)
		c.JSON(http.StatusConflict, response.NewResponse(constants.ProjectBusy.Code, constants.ProjectBusy.Message, nil))
	case errors.Is(err, ctrl.ErrEmptyScript):
		logger.ERROR.Printf("[ProjectProcess] empty script: %s", id)
		c.JSON(http.StatusBadRequest, response.NewResponse(constants.EmptyScript.Code, constants.EmptyScript.Message, nil))
	case err != nil:
		logger.ERROR.Printf("[ProjectProcess] failed: %+v", err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
	default:
		logger.INFO.Printf("[ProjectProcess] started for %s", id)
		c.JSON(http.StatusAccepted, response.NewResponse(constants.Success.Code, constants.Success.Message, nil))
	}
}
