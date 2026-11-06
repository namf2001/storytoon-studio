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

// Get handles GET /projects/:id.
func (h Handler) Get(c *gin.Context) {
	out, err := h.ctrl.Get(c.Request.Context(), c.Param("id"))
	if errors.Is(err, ctrl.ErrNotFound) {
		logger.ERROR.Printf("[ProjectGet] not found: %s", c.Param("id"))
		c.JSON(http.StatusNotFound, response.NewResponse(constants.NotFound.Code, constants.NotFound.Message, nil))
		return
	}
	if err != nil {
		logger.ERROR.Printf("[ProjectGet] failed: %+v", err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
		return
	}
	logger.INFO.Printf("[ProjectGet] project %s status=%s", out.ID, out.Status)
	c.JSON(http.StatusOK, response.NewResponse(constants.Success.Code, constants.Success.Message, toProjectResponse(out)))
}
