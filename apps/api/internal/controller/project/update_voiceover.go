package project

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"

	"storytoon/internal/model"
)

// UpdateVoiceoverInput holds the parameters for updating a project's voiceover and word timestamps.
type UpdateVoiceoverInput struct {
	Script        *string
	AudioURL      string
	CaptionSrtURL *string
	CaptionVttURL *string
	DurationMs    int
	Words         json.RawMessage
	Status        string
}

// UpdateVoiceover updates the audio path, duration, words, and optional script/captions of a project.
func (i impl) UpdateVoiceover(ctx context.Context, id string, input UpdateVoiceoverInput) (Output, error) {
	p, err := i.repo.Project().GetByID(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return Output{}, ErrNotFound
	}
	if err != nil {
		return Output{}, err
	}

	if input.Script != nil && strings.TrimSpace(*input.Script) != "" {
		p.RawScript = strings.TrimSpace(*input.Script)
	}

	if strings.TrimSpace(input.AudioURL) != "" {
		cleanAudio := i.stripMediaPrefix(input.AudioURL)
		p.AudioPath = &cleanAudio
	}

	if input.CaptionSrtURL != nil {
		if strings.TrimSpace(*input.CaptionSrtURL) == "" {
			p.CaptionSrtPath = nil
		} else {
			cleanSrt := i.stripMediaPrefix(*input.CaptionSrtURL)
			p.CaptionSrtPath = &cleanSrt
		}
	}

	if input.CaptionVttURL != nil {
		if strings.TrimSpace(*input.CaptionVttURL) == "" {
			p.CaptionVttPath = nil
		} else {
			cleanVtt := i.stripMediaPrefix(*input.CaptionVttURL)
			p.CaptionVttPath = &cleanVtt
		}
	}

	if input.DurationMs > 0 {
		p.DurationMs = input.DurationMs
	}

	if len(input.Words) > 0 && string(input.Words) != "null" {
		p.Words = input.Words
	} else if len(p.Words) == 0 {
		p.Words = json.RawMessage("[]")
	}

	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = model.ProjectStatusReady
	}
	p.Status = status

	updated, err := i.repo.Project().UpdateVoiceover(ctx, p)
	if err != nil {
		return Output{}, err
	}

	scenes, err := i.repo.Scene().ListByProject(ctx, id)
	if err != nil {
		return Output{}, err
	}

	return i.toOutput(updated, scenes), nil
}

func (i impl) stripMediaPrefix(raw string) string {
	val := strings.TrimSpace(raw)
	prefix := strings.TrimRight(i.mediaBaseURL, "/") + "/"
	if strings.HasPrefix(val, prefix) {
		return strings.TrimPrefix(val, prefix)
	}
	return val
}
