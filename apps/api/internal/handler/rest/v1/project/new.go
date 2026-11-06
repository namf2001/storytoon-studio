package project

import (
	"encoding/json"
	"time"

	ctrl "storytoon/internal/controller/project"
)

// Handler exposes project REST endpoints.
type Handler struct {
	ctrl ctrl.Controller
}

// New creates a project Handler.
func New(c ctrl.Controller) Handler {
	return Handler{ctrl: c}
}

type sceneResponse struct {
	ID             string          `json:"id"`
	ProjectID      string          `json:"projectId"`
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

type projectResponse struct {
	ID            string          `json:"id"`
	Title         string          `json:"title"`
	RawScript     string          `json:"rawScript"`
	AudioURL      *string         `json:"audioUrl"`
	CaptionSrtURL *string         `json:"captionSrtUrl"`
	CaptionVttURL *string         `json:"captionVttUrl"`
	DurationMs    int             `json:"durationMs"`
	AspectRatio   string          `json:"aspectRatio"`
	VideoType     string          `json:"videoType"`
	Status        string          `json:"status"`
	ErrorMessage  *string         `json:"errorMessage"`
	Characters    json.RawMessage `json:"characters"`
	Words         json.RawMessage `json:"words"`
	Scenes        []sceneResponse `json:"scenes"`
	CreatedAt     time.Time       `json:"createdAt"`
}

func toProjectResponse(o ctrl.Output) projectResponse {
	res := projectResponse{
		ID: o.ID, Title: o.Title, RawScript: o.RawScript, AudioURL: o.AudioURL,
		CaptionSrtURL: o.CaptionSrtURL, CaptionVttURL: o.CaptionVttURL, DurationMs: o.DurationMs,
		AspectRatio: o.AspectRatio, VideoType: o.VideoType, Status: o.Status, ErrorMessage: o.ErrorMessage,
		Characters: o.Characters, Words: o.Words, CreatedAt: o.CreatedAt,
		Scenes: make([]sceneResponse, 0, len(o.Scenes)),
	}
	for _, s := range o.Scenes {
		res.Scenes = append(res.Scenes, sceneResponse{
			ID: s.ID, ProjectID: o.ID, SceneIndex: s.SceneIndex, StartMs: s.StartMs, EndMs: s.EndMs,
			TranscriptText: s.TranscriptText, Setting: s.Setting, Characters: s.Characters,
			ImagePrompt: s.ImagePrompt, ImageURL: s.ImageURL, CameraEffect: s.CameraEffect,
			Transition: s.Transition, ShowCaption: s.ShowCaption,
			LayoutType: s.LayoutType, Layers: s.Layers,
			CalloutTag: s.CalloutTag, CalloutText: s.CalloutText,
			CalloutPosition: s.CalloutPosition, CalloutTheme: s.CalloutTheme,
		})
	}
	return res
}
