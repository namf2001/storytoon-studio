package scene

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"strings"

	"storytoon/internal/aiworker"
	"storytoon/internal/model"
	"storytoon/internal/repository"
)

var (
	// ErrNotFound is returned when the scene does not exist.
	ErrNotFound = errors.New("scene not found")
	// ErrInvalidImage is returned when the uploaded file is not a supported image.
	ErrInvalidImage = errors.New("invalid image")
	// ErrInvalidInput is returned when an update contains unsupported values.
	ErrInvalidInput = errors.New("invalid input")
)

// Controller contains business logic for scenes.
type Controller interface {
	Update(ctx context.Context, id string, input UpdateInput) (Output, error)
	UploadImage(ctx context.Context, id, filename string, file io.Reader) (Output, error)
	GenerateImage(ctx context.Context, id, promptOverride string) (Output, error)
}

type impl struct {
	repo         repository.Registry
	ai           aiworker.Client
	storageDir   string
	mediaBaseURL string
}

// New creates a scene Controller.
func New(repo repository.Registry, ai aiworker.Client, storageDir, mediaBaseURL string) Controller {
	return impl{repo: repo, ai: ai, storageDir: storageDir, mediaBaseURL: mediaBaseURL}
}

// Output is the scene representation returned by the controller.
type Output struct {
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

func (i impl) toOutput(s model.Scene) Output {
	var url *string
	if s.ImagePath != nil && *s.ImagePath != "" {
		raw := *s.ImagePath
		if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") || strings.HasPrefix(raw, "blob:") {
			url = &raw
		} else if strings.HasPrefix(raw, "/") {
			url = &raw
		} else {
			u := strings.TrimRight(i.mediaBaseURL, "/") + "/" + strings.TrimLeft(raw, "/")
			url = &u
		}
	}
	layoutType := s.LayoutType
	if layoutType == "" {
		layoutType = "standard"
	}
	layers := s.Layers
	if len(layers) == 0 {
		layers = []byte("[]")
	}
	return Output{
		ID: s.ID, SceneIndex: s.SceneIndex, StartMs: s.StartMs, EndMs: s.EndMs,
		TranscriptText: s.TranscriptText, Setting: s.Setting, Characters: s.Characters,
		ImagePrompt: s.ImagePrompt, ImageURL: url, CameraEffect: s.CameraEffect,
		Transition: s.Transition, ShowCaption: s.ShowCaption,
		LayoutType: layoutType, Layers: layers,
		CalloutTag: s.CalloutTag, CalloutText: s.CalloutText,
		CalloutPosition: s.CalloutPosition, CalloutTheme: s.CalloutTheme,
	}
}
