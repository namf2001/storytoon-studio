package scene

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"storytoon/internal/constants"
	ctrl "storytoon/internal/controller/scene"
	"storytoon/internal/handler/response"
	"storytoon/internal/logger"
)

type updateRequest struct {
	ImagePrompt    *string          `json:"imagePrompt"`
	ImageURL       *string          `json:"imageUrl"`
	Setting        *string          `json:"setting"`
	CameraEffect   *string          `json:"cameraEffect"`
	Transition     *string          `json:"transition"`
	ShowCaption    *bool            `json:"showCaption"`
	StartMs        *int             `json:"startMs"`
	EndMs          *int             `json:"endMs"`
	TranscriptText *string          `json:"transcriptText"`
	SceneIndex     *int             `json:"sceneIndex"`
	LayoutType     *string          `json:"layoutType"`
	Layers         *json.RawMessage `json:"layers"`
	CalloutTag     *string          `json:"calloutTag"`
	CalloutText    *string          `json:"calloutText"`
	CalloutPosition *string         `json:"calloutPosition"`
	CalloutTheme   *string          `json:"calloutTheme"`
}

// Update handles PATCH /scenes/:id.
func (h Handler) Update(c *gin.Context) {
	var req updateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.ERROR.Printf("[SceneUpdate] failed request param: %+v", err)
		c.JSON(http.StatusBadRequest, response.NewResponse(constants.InvalidRequest.Code, constants.InvalidRequest.Message, nil))
		return
	}
	out, err := h.ctrl.Update(c.Request.Context(), c.Param("id"), ctrl.UpdateInput{
		ImagePrompt: req.ImagePrompt, ImageURL: req.ImageURL, Setting: req.Setting, CameraEffect: req.CameraEffect,
		Transition: req.Transition, ShowCaption: req.ShowCaption,
		StartMs: req.StartMs, EndMs: req.EndMs, TranscriptText: req.TranscriptText, SceneIndex: req.SceneIndex,
		LayoutType: req.LayoutType, Layers: req.Layers,
		CalloutTag: req.CalloutTag, CalloutText: req.CalloutText,
		CalloutPosition: req.CalloutPosition, CalloutTheme: req.CalloutTheme,
	})
	switch {
	case errors.Is(err, ctrl.ErrNotFound):
		logger.ERROR.Printf("[SceneUpdate] not found: %s", c.Param("id"))
		c.JSON(http.StatusNotFound, response.NewResponse(constants.NotFound.Code, constants.NotFound.Message, nil))
	case errors.Is(err, ctrl.ErrInvalidInput):
		logger.ERROR.Printf("[SceneUpdate] invalid input: %+v", req)
		c.JSON(http.StatusBadRequest, response.NewResponse(constants.InvalidRequest.Code, constants.InvalidRequest.Message, nil))
	case err != nil:
		logger.ERROR.Printf("[SceneUpdate] failed: %+v", err)
		c.JSON(http.StatusInternalServerError, response.NewResponse(constants.InternalError.Code, constants.InternalError.Message, nil))
	default:
		logger.INFO.Printf("[SceneUpdate] updated scene %s", out.ID)
		c.JSON(http.StatusOK, response.NewResponse(constants.Success.Code, constants.Success.Message, toSceneResponse(out)))
	}
}
