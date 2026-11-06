package project

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"storytoon/internal/constants"
	ctrl "storytoon/internal/controller/project"
	"storytoon/internal/handler/response"
	"storytoon/internal/logger"
)

type createRequest struct {
	Title       string `json:"title" binding:"required,max=255"`
	Script      string `json:"script" binding:"required"`
	AspectRatio string `json:"aspectRatio" binding:"omitempty,oneof=16:9 9:16"`
	VideoType   string `json:"videoType" binding:"omitempty,max=50"`
}

// Create handles POST /projects.
func (h Handler) Create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.ERROR.Printf("[ProjectCreate] failed request param: %+v", err)
		c.JSON(http.StatusBadRequest, response.NewResponse(constants.InvalidRequest.Code, constants.InvalidRequest.Message, nil))
		return
	}
	out, err := h.ctrl.Create(c.Request.Context(), ctrl.CreateInput{
		Title: req.Title, Script: req.Script, AspectRatio: req.AspectRatio, VideoType: req.VideoType,
	})
	if err != nil {
		logger.ERROR.Printf("[ProjectCreate] create failed: %+v", err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
		return
	}
	logger.INFO.Printf("[ProjectCreate] created project %s", out.ID)
	c.JSON(http.StatusOK, response.NewResponse(constants.Success.Code, constants.Success.Message, toProjectResponse(out)))
}
