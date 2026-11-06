package project

import (
	"context"

	"github.com/google/uuid"

	"storytoon/internal/model"
)

// CreateInput is the data required to create a project.
type CreateInput struct {
	Title       string
	Script      string
	AspectRatio string
	VideoType   string
}

// Create stores a new draft project.
func (i impl) Create(ctx context.Context, input CreateInput) (Output, error) {
	ratio := input.AspectRatio
	if ratio != "9:16" {
		ratio = "16:9"
	}
	videoType := input.VideoType
	if videoType == "" {
		videoType = "storytoon"
	}
	p, err := i.repo.Project().Create(ctx, model.Project{
		ID: uuid.NewString(), Title: input.Title, RawScript: input.Script,
		AspectRatio: ratio, VideoType: videoType, Status: model.ProjectStatusDraft,
	})
	if err != nil {
		return Output{}, err
	}
	return i.toOutput(p, nil), nil
}
