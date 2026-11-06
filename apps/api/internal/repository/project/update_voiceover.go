package project

import (
	"context"

	"storytoon/internal/model"
)

// UpdateVoiceover updates the voiceover audio, captions, duration, words, script, and status of a project.
func (i impl) UpdateVoiceover(ctx context.Context, p model.Project) (model.Project, error) {
	row := i.db.QueryRowContext(ctx, `
		UPDATE projects
		SET raw_script = $2,
			audio_path = $3,
			caption_srt_path = $4,
			caption_vtt_path = $5,
			duration_ms = $6,
			words = $7,
			status = $8,
			error_message = NULL,
			updated_at = now()
		WHERE id = $1
		RETURNING `+selectColumns,
		p.ID, p.RawScript, p.AudioPath, p.CaptionSrtPath, p.CaptionVttPath,
		p.DurationMs, p.Words, p.Status,
	)
	return scanProject(row)
}
