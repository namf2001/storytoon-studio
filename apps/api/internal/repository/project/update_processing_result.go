package project

import (
	"context"

	"storytoon/internal/model"
)

// UpdateProcessingResult stores AI worker outputs (audio, captions, words, characters).
func (i impl) UpdateProcessingResult(ctx context.Context, p model.Project) error {
	_, err := i.db.ExecContext(ctx, `
		UPDATE projects SET audio_path = $2, caption_srt_path = $3, caption_vtt_path = $4,
			duration_ms = $5, characters = $6, words = $7, status = $8, error_message = NULL,
			updated_at = now()
		WHERE id = $1`,
		p.ID, p.AudioPath, p.CaptionSrtPath, p.CaptionVttPath, p.DurationMs,
		p.Characters, p.Words, p.Status)
	return err
}
