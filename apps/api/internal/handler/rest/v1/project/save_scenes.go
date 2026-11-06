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

type saveScenesRequest struct {
	Scenes []ctrl.SceneInput `json:"scenes" binding:"required"`
}

// SaveScenes handles PUT /projects/:id/scenes and POST /projects/:id/scenes.
func (h Handler) SaveScenes(c *gin.Context) {
	var req saveScenesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.ERROR.Printf("[ProjectSaveScenes] invalid body: %+v", err)
		c.JSON(http.StatusBadRequest, response.NewResponse(constants.InvalidRequest.Code, constants.InvalidRequest.Message, nil))
		return
	}
	out, err := h.ctrl.SaveScenes(c.Request.Context(), c.Param("id"), req.Scenes)
	switch {
	case errors.Is(err, ctrl.ErrNotFound):
		logger.ERROR.Printf("[ProjectSaveScenes] not found: %s", c.Param("id"))
		c.JSON(http.StatusNotFound, response.NewResponse(constants.NotFound.Code, constants.NotFound.Message, nil))
	case err != nil:
		logger.ERROR.Printf("[ProjectSaveScenes] failed: %+v", err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
	default:
		logger.INFO.Printf("[ProjectSaveScenes] saved %d scenes for project %s", len(out), c.Param("id"))
		c.JSON(http.StatusOK, response.NewResponse(constants.Success.Code, constants.Success.Message, toProjectResponse(ctrl.Output{
			ID:     c.Param("id"),
			Scenes: out,
		}).Scenes))
	}
}
