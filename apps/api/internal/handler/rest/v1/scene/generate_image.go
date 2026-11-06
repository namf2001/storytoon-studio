package scene

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"storytoon/internal/constants"
	ctrl "storytoon/internal/controller/scene"
	"storytoon/internal/handler/response"
	"storytoon/internal/logger"
)

type generateImageRequest struct {
	ImagePrompt string `json:"imagePrompt"`
}

// GenerateImage handles POST /scenes/:id/generate-image.
func (h Handler) GenerateImage(c *gin.Context) {
	var req generateImageRequest
	_ = c.ShouldBindJSON(&req)

	out, err := h.ctrl.GenerateImage(c.Request.Context(), c.Param("id"), req.ImagePrompt)
	switch {
	case errors.Is(err, ctrl.ErrNotFound):
		logger.ERROR.Printf("[SceneGenerateImage] not found: %s", c.Param("id"))
		c.JSON(http.StatusNotFound, response.NewResponse(constants.NotFound.Code, constants.NotFound.Message, nil))
	case err != nil:
		logger.ERROR.Printf("[SceneGenerateImage] failed: %+v", err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
	default:
		logger.INFO.Printf("[SceneGenerateImage] generated image for scene %s", out.ID)
		c.JSON(http.StatusOK, response.NewResponse(constants.Success.Code, constants.Success.Message, toSceneResponse(out)))
	}
}
