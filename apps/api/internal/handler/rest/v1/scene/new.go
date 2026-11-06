package scene

import (
	"encoding/json"

	ctrl "storytoon/internal/controller/scene"
)

// Handler exposes scene REST endpoints.
type Handler struct {
	ctrl ctrl.Controller
}

// New creates a scene Handler.
func New(c ctrl.Controller) Handler {
	return Handler{ctrl: c}
}

type sceneResponse struct {
	ID             string          `json:"id"`
	SceneIndex     int             `json:"sceneIndex"`
	StartMs        int             `json:"startMs"`
	EndMs          int             `json:"endMs"`
	TranscriptText string          `json:"transcriptText"`
	Setting        string          `json:"setting"`
	Characters     json.RawMessage `json:"characters"`
	ImagePrompt    string          `json:"imagePrompt"`
	ImageURL       *string         `json:"imageUrl"`
	CameraEffect   string          `json:"cameraEffect"`
	Transition     string          `json:"transition"`
	ShowCaption    bool            `json:"showCaption"`
	LayoutType     string          `json:"layoutType"`
	Layers         json.RawMessage `json:"layers"`
	CalloutTag     string          `json:"calloutTag"`
	CalloutText    string          `json:"calloutText"`
	CalloutPosition string         `json:"calloutPosition"`
	CalloutTheme   string          `json:"calloutTheme"`
}

func toSceneResponse(o ctrl.Output) sceneResponse {
	return sceneResponse{
		ID: o.ID, SceneIndex: o.SceneIndex, StartMs: o.StartMs, EndMs: o.EndMs,
		TranscriptText: o.TranscriptText, Setting: o.Setting, Characters: o.Characters,
		ImagePrompt: o.ImagePrompt, ImageURL: o.ImageURL, CameraEffect: o.CameraEffect,
		Transition: o.Transition, ShowCaption: o.ShowCaption,
		LayoutType: o.LayoutType, Layers: o.Layers,
		CalloutTag: o.CalloutTag, CalloutText: o.CalloutText,
		CalloutPosition: o.CalloutPosition, CalloutTheme: o.CalloutTheme,
	}
}
