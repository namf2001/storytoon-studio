---
version: 1
slug: "components-studio-nlestudio-tsx"
primary_target: "components/studio/NleStudio.tsx"
related_targets: ["app/page.tsx","components/layout/app-shell.tsx","components/nle/NleTimeline.tsx","components/nle/NleInspector.tsx"]
---

# Surface brief: Studio editor + Dashboard

Scope: the shared NLE studio (`/product`, `/football`, and the `/projects/[id]` editor) plus the dashboard `/` and the app shell. Mode: Operate.
Audience and job: the owner, alone, producing short videos in volume; open a project, correct the AI draft on the timeline, export.
Constraints: Vietnamese UI copy; desktop-first editor (≥1024px), dashboard must work on phones; preserve every function and keyboard shortcut.
Quality bar: CapCut Desktop and Descript.

## Direction contract

THESIS: The category standard, executed at CapCut and Descript craft: the video is the loudest thing on screen and the chrome is a quiet graphite instrument. Refuses the incumbent's per-panel colour noise (amber, emerald, cyan, purple everywhere), emoji used as icons, and 8–10px functional text.

OWN-WORLD: A neutral graphite ramp (app ground, panel, raised, hairline border) with secondary text that clears 4.5:1; one accent blue for selection, focus and the primary action; red only for the playhead and destructive actions. Track colours are muted category conventions (video slate blue, captions muted amber, voice muted green, music muted teal, effects muted violet). Inter with tabular figures; 12px functional floor, 13px body; 6–8px radii; 1px borders; no glows, gradients or emoji in chrome; Lucide icons only.

STORY: The operator sees the project name and export state at a glance, the video large in the centre, scenes as clips on the timeline, and the selected scene's settings on the right; they trim, swap media, adjust captions, and export without hunting.

FIRST VIEWPORT: 48px top bar (Media/Inspector toggles, project picker, undo/redo, Biên tập/Xuất video segmented control centred, blue "Xuất video" primary right). Below: Media Pool 260px left, scene monitor and program monitor centre on the darkest ground, Inspector 300px right, timeline across the bottom at ~32% height with a 28px ruler and labelled track headers. Dashboard: create-project form leads, project list beside it.

FORM: Category standard (the canon card, chosen by the owner over the dealt world). seed: seed:21552896acbaf602

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
