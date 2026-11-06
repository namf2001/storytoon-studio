CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    raw_script      TEXT NOT NULL,
    audio_path      TEXT,
    caption_srt_path TEXT,
    caption_vtt_path TEXT,
    duration_ms     INT NOT NULL DEFAULT 0,
    aspect_ratio    VARCHAR(10) NOT NULL DEFAULT '16:9',
    video_type      VARCHAR(50) NOT NULL DEFAULT 'storytoon',
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    error_message   TEXT,
    characters      JSONB NOT NULL DEFAULT '[]',
    words           JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenes (
    id              UUID PRIMARY KEY,
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    scene_index     INT NOT NULL,
    start_ms        INT NOT NULL,
    end_ms          INT NOT NULL,
    transcript_text TEXT NOT NULL,
    setting         TEXT NOT NULL DEFAULT '',
    characters      JSONB NOT NULL DEFAULT '[]',
    image_prompt    TEXT NOT NULL DEFAULT '',
    image_path      TEXT,
    camera_effect   VARCHAR(30) NOT NULL DEFAULT 'zoom_in',
    transition      VARCHAR(30) NOT NULL DEFAULT 'cut',
    show_caption    BOOLEAN NOT NULL DEFAULT TRUE,
    layout_type     VARCHAR(50) NOT NULL DEFAULT 'standard',
    layers          JSONB NOT NULL DEFAULT '[]',
    UNIQUE (project_id, scene_index)
);
CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
