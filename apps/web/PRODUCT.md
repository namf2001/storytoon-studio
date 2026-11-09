# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single operator (the owner) who produces short-form videos in volume as a business: Shopee affiliate product commercials, football news Shorts, and narrated 2D story videos. They sit at a desktop for long sessions, moving project to project, and value speed of turnaround over one-off artistry.

## Product Purpose

Storytoon Studio turns a written script into a finished vertical (or 16:9) video. The AI pipeline generates the voice-over, word-level captions and a scene breakdown with image prompts; the operator attaches or generates media per scene, trims and arranges on a multi-track timeline, then renders MP4 and uploads to YouTube Shorts from inside the app. Success means a publishable video from a script with as little manual editing as possible.

## Positioning

Script-first, not footage-first: the edit starts from AI-generated voice, captions and scene cuts, and the timeline exists to correct and refine that draft. Each video type (product commercial, football broadcast, 2D story) has its own ready-made template and export composition.

## Operating Context

- Workflow: dashboard → create project from script (choose voice, ratio) → studio (Media Pool, scene viewer, program monitor, inspector, timeline) → Deliver (render MP4, YouTube metadata, upload).
- Studios: `/product` (product commercials, 9:16), `/football` (broadcast templates: graphic news / VTV News Reel), `/projects/[id]` (2D story).
- Interface language is Vietnamese; video-editing terms (Timeline, Media Pool, B-Roll) stay in English.
- Rendering uses Remotion compositions; the backend is a Go API plus a Python AI worker (VieNeu TTS, Whisper, Groq LLM).

## Capabilities and Constraints

- Next.js 15 + React 19 + Tailwind 3 + shadcn/Radix; Remotion Player for previews.
- Desktop-first: the editor needs ≥1024px; the dashboard must also work on a phone.
- Editing is local-first with undo/redo; demo projects ship as presets in code.
- Timeline SFX clips are not yet rendered or persisted (open product gap).

## Brand Commitments

Only the name "Storytoon Studio" and Vietnamese UI copy are binding. Colour, type, logo and layout are open to replacement (confirmed by the owner, 2026-11-08).

Standing preference (2026-11-08): the owner chose the category standard over a distinctive world. The editor should sit alongside CapCut Desktop and Descript and match their craft level: conventions embraced, executed precisely.

## Evidence on Hand

Real demo projects with media under `apps/web/public/product-*` and `storage/` (product clips, reference images, voice tracks, football goal clips). No customers, testimonials or metrics exist; none may be invented.

## Product Principles

1. The draft comes from the script; the UI exists to correct it fast.
2. The video is the loudest thing on screen; chrome recedes.
3. Every frequent action is one click or one key away; nothing important hides behind hover.
4. Long-session comfort: legible text, calm surfaces, no decorative noise.
5. One studio, many video types: templates differ, the workspace does not.

## Accessibility & Inclusion

Single operator with no stated special needs; target WCAG 2.2 AA (4.5:1 text contrast, visible focus, keyboard operation of the timeline) as the quality floor.
