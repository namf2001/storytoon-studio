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

// UploadImage handles POST /scenes/:id/image (multipart field "image").
func (h Handler) UploadImage(c *gin.Context) {
	fh, err := c.FormFile("image")
	if err != nil {
		logger.ERROR.Printf("[SceneUploadImage] missing file: %+v", err)
		c.JSON(http.StatusBadRequest, response.NewResponse(constants.InvalidImage.Code, constants.InvalidImage.Message, nil))
		return
	}
	f, err := fh.Open()
	if err != nil {
		logger.ERROR.Printf("[SceneUploadImage] open file: %+v", err)
		c.JSON(http.StatusBadRequest, response.NewResponse(constants.InvalidImage.Code, constants.InvalidImage.Message, nil))
		return
	}
	defer f.Close()

	out, err := h.ctrl.UploadImage(c.Request.Context(), c.Param("id"), fh.Filename, f)
	switch {
	case errors.Is(err, ctrl.ErrNotFound):
		logger.ERROR.Printf("[SceneUploadImage] not found: %s", c.Param("id"))
		c.JSON(http.StatusNotFound, response.NewResponse(constants.NotFound.Code, constants.NotFound.Message, nil))
	case errors.Is(err, ctrl.ErrInvalidImage):
		logger.ERROR.Printf("[SceneUploadImage] invalid image: %s", fh.Filename)
		c.JSON(http.StatusBadRequest, response.NewResponse(constants.InvalidImage.Code, constants.InvalidImage.Message, nil))
	case err != nil:
		logger.ERROR.Printf("[SceneUploadImage] failed: %+v", err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
	default:
		logger.INFO.Printf("[SceneUploadImage] scene %s image saved", out.ID)
		c.JSON(http.StatusOK, response.NewResponse(constants.Success.Code, constants.Success.Message, toSceneResponse(out)))
	}
}
