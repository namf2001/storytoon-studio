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

// Delete handles DELETE /projects/:id.
func (h Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	err := h.ctrl.Delete(c.Request.Context(), id)
	switch {
	case errors.Is(err, ctrl.ErrNotFound):
		logger.ERROR.Printf("[ProjectDelete] not found: %s", id)
		c.JSON(http.StatusNotFound, response.NewResponse(constants.NotFound.Code, constants.NotFound.Message, nil))
	case err != nil:
		logger.ERROR.Printf("[ProjectDelete] failed: %+v", err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
	default:
		logger.INFO.Printf("[ProjectDelete] successfully deleted project %s", id)
		c.JSON(http.StatusOK, response.NewResponse(constants.Success.Code, constants.Success.Message, gin.H{"id": id}))
	}
}
