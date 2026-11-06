package project

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"storytoon/internal/model"
)

// Output is the full project representation returned by the controller.
type Output struct {
	ID            string
	Title         string
	RawScript     string
	AudioURL      *string
	CaptionSrtURL *string
	CaptionVttURL *string
	DurationMs    int
	AspectRatio   string
	VideoType     string
	Status        string
	ErrorMessage  *string
	Characters    json.RawMessage
	Words         json.RawMessage
	Scenes        []SceneOutput
	CreatedAt     time.Time
}

// SceneOutput is a scene as returned within a project.
type SceneOutput struct {
	ID             string
	SceneIndex     int
	StartMs        int
	EndMs          int
	TranscriptText string
	Setting        string
	Characters     json.RawMessage
	ImagePrompt    string
	ImageURL       *string
	CameraEffect   string
	Transition     string
	ShowCaption    bool
	LayoutType     string
	Layers         json.RawMessage
	CalloutTag     string
	CalloutText    string
	CalloutPosition string
	CalloutTheme   string
}

// Get returns a project with its scenes.
func (i impl) Get(ctx context.Context, id string) (Output, error) {
	p, err := i.repo.Project().GetByID(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return Output{}, ErrNotFound
	}
	if err != nil {
		return Output{}, err
	}
	scenes, err := i.repo.Scene().ListByProject(ctx, id)
	if err != nil {
		return Output{}, err
	}
	return i.toOutput(p, scenes), nil
}

func (i impl) toOutput(p model.Project, scenes []model.Scene) Output {
	out := Output{
		ID: p.ID, Title: p.Title, RawScript: p.RawScript,
		AudioURL: i.mediaURL(p.AudioPath), CaptionSrtURL: i.mediaURL(p.CaptionSrtPath),
		CaptionVttURL: i.mediaURL(p.CaptionVttPath), DurationMs: p.DurationMs,
		AspectRatio: p.AspectRatio, VideoType: p.VideoType, Status: p.Status, ErrorMessage: p.ErrorMessage,
		Characters: p.Characters, Words: p.Words, CreatedAt: p.CreatedAt,
		Scenes: make([]SceneOutput, 0, len(scenes)),
	}
	for _, s := range scenes {
		layoutType := s.LayoutType
		if layoutType == "" {
			layoutType = "standard"
		}
		layers := s.Layers
		if len(layers) == 0 {
			layers = json.RawMessage("[]")
		}
		out.Scenes = append(out.Scenes, SceneOutput{
			ID: s.ID, SceneIndex: s.SceneIndex, StartMs: s.StartMs, EndMs: s.EndMs,
			TranscriptText: s.TranscriptText, Setting: s.Setting, Characters: s.Characters,
			ImagePrompt: s.ImagePrompt, ImageURL: i.mediaURL(s.ImagePath),
			CameraEffect: s.CameraEffect, Transition: s.Transition, ShowCaption: s.ShowCaption,
			LayoutType: layoutType, Layers: layers,
			CalloutTag: s.CalloutTag, CalloutText: s.CalloutText,
			CalloutPosition: s.CalloutPosition, CalloutTheme: s.CalloutTheme,
		})
	}
	return out
}
