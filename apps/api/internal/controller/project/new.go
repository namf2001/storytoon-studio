package project

import (
	"context"
	"errors"
	"strings"

	"storytoon/internal/aiworker"
	"storytoon/internal/repository"
)

var (
	// ErrNotFound is returned when the project does not exist.
	ErrNotFound = errors.New("project not found")
	// ErrBusy is returned when the project is already processing.
	ErrBusy = errors.New("project is processing")
	// ErrEmptyScript is returned when the project script is empty.
	ErrEmptyScript = errors.New("script is empty")
)

// Controller contains business logic for projects.
type Controller interface {
	Create(ctx context.Context, input CreateInput) (Output, error)
	Get(ctx context.Context, id string) (Output, error)
	List(ctx context.Context) ([]Summary, error)
	Process(ctx context.Context, id, voiceID string) error
	UpdateVoiceover(ctx context.Context, id string, input UpdateVoiceoverInput) (Output, error)
	SaveScenes(ctx context.Context, id string, scenes []SceneInput) ([]SceneOutput, error)
	Delete(ctx context.Context, id string) error
}

type impl struct {
	repo         repository.Registry
	ai           aiworker.Client
	storageDir   string
	mediaBaseURL string
}

// New creates a project Controller.
func New(repo repository.Registry, ai aiworker.Client, storageDir, mediaBaseURL string) Controller {
	return impl{repo: repo, ai: ai, storageDir: storageDir, mediaBaseURL: mediaBaseURL}
}

func (i impl) mediaURL(path *string) *string {
	if path == nil || *path == "" {
		return nil
	}
	raw := *path
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") || strings.HasPrefix(raw, "blob:") {
		return &raw
	}
	if strings.HasPrefix(raw, "/") {
		return &raw
	}
	u := strings.TrimRight(i.mediaBaseURL, "/") + "/" + strings.TrimLeft(raw, "/")
	return &u
}
