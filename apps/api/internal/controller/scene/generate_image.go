package scene

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"storytoon/internal/aiworker"
)

// GenerateImage synthesizes a 2D cartoon illustration for a scene using FLUX.1-schnell.
func (i impl) GenerateImage(ctx context.Context, id, promptOverride string) (Output, error) {
	s, err := i.repo.Scene().GetByID(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return Output{}, ErrNotFound
	}
	if err != nil {
		return Output{}, err
	}

	p, err := i.repo.Project().GetByID(ctx, s.ProjectID)
	if err != nil {
		return Output{}, err
	}

	prompt := strings.TrimSpace(promptOverride)
	if prompt != "" && !strings.HasPrefix(prompt, "http://") && !strings.HasPrefix(prompt, "https://") {
		s.ImagePrompt = prompt
	} else if prompt == "" {
		prompt = strings.TrimSpace(s.ImagePrompt)
	}
	if prompt == "" {
		prompt = s.TranscriptText
	}

	res, err := i.ai.GenerateSceneImage(ctx, aiworker.GenerateImageInput{
		ProjectID:   s.ProjectID,
		SceneIndex:  s.SceneIndex,
		Prompt:      prompt,
		AspectRatio: p.AspectRatio,
	})
	if err != nil {
		return Output{}, err
	}

	s.ImagePath = &res.ImagePath
	updated, err := i.repo.Scene().Update(ctx, s)
	if err != nil {
		return Output{}, err
	}
	return i.toOutput(updated), nil
}
