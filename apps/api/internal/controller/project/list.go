package project

import (
	"context"
	"time"
)

// Summary is a lightweight project representation for listings.
type Summary struct {
	ID          string
	Title       string
	Status      string
	AspectRatio string
	VideoType   string
	DurationMs  int
	CreatedAt   time.Time
	// ThumbnailURL is the first scene's media URL (image or video clip), if any.
	ThumbnailURL *string
}

// List returns summaries of all projects.
func (i impl) List(ctx context.Context) ([]Summary, error) {
	items, err := i.repo.Project().List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]Summary, 0, len(items))
	for _, p := range items {
		out = append(out, Summary{
			ID: p.ID, Title: p.Title, Status: p.Status, AspectRatio: p.AspectRatio,
			VideoType: p.VideoType, DurationMs: p.DurationMs, CreatedAt: p.CreatedAt,
			ThumbnailURL: i.mediaURL(p.ThumbnailPath),
		})
	}
	return out, nil
}
