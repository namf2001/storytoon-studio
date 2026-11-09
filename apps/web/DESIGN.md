---
name: Storytoon Studio
description: Script-first short-video editor; the video is the loudest thing on screen.
colors:
  graphite-ground: "#131417"
  monitor-black: "#0F1012"
  panel-graphite: "#1A1B1F"
  toolbar-graphite: "#17181B"
  raised-graphite: "#1E1F23"
  hairline: "#303237"
  field-graphite: "#34363C"
  ink: "#E8E9EC"
  ink-muted: "#A9ADB4"
  cut-blue: "#2563EB"
  cut-blue-text: "#60A5FA"
  on-cut-blue: "#FFFFFF"
  danger: "#DC2626"
  playhead-red: "#EF4444"
  track-video: "#38BDF8"
  track-captions: "#FCD34D"
  track-voice: "#34D399"
  track-sfx: "#C084FC"
  track-music: "#22D3EE"
  status-ready: "#34D399"
  status-processing: "#FBBF24"
  status-failed: "#F87171"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  timecode:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    fontFeature: "tnum"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.cut-blue}"
    textColor: "{colors.on-cut-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "28px"
  button-secondary:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "28px"
  chip-selected:
    backgroundColor: "#2563EB26"
    textColor: "{colors.cut-blue-text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  chip-idle:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  input:
    backgroundColor: "{colors.panel-graphite}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
  nav-item-active:
    backgroundColor: "#2563EB26"
    textColor: "{colors.cut-blue-text}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
---

# Design System: Storytoon Studio

## Overview

**Creative North Star: "The Quiet Edit Bay"**

A darkened edit suite where only the picture is lit. Every panel around the monitors steps back into neutral graphite so the operator's eye stays on the frame they are cutting; the chrome speaks only when it has to, and then in one colour. The system follows the category standard on purpose, measured against CapCut Desktop and Descript: familiar NLE topology (media pool left, monitors centre, inspector right, multi-track timeline below), executed precisely rather than reinvented.

Density is high because the operator works long sessions at a desktop, but legibility never drops below the floor: functional text is 12px or larger, secondary text clears 7:1, and every timecode uses tabular figures so it never jitters. Colour has three jobs only: the single accent marks the action or selection, track hues identify media types on the timeline, and status colours report state.

**Key Characteristics:**
- Neutral graphite ramp; the monitors sit on the darkest ground.
- One accent blue: solid fill for the primary action, tinted fill for selection.
- Track hues (video, captions, voice, effects, music) live on the timeline only.
- Inter for UI, JetBrains Mono for timecodes and measurements.
- Flat, hairline-separated surfaces; no glows, gradients-as-decoration or emoji icons.

## Colors

A cool neutral graphite field with one disciplined blue and a fixed set of functional hues.

### Primary
- **Cut Blue** (#2563EB): fill of the one primary action per view (Xuất video, Tạo giọng đọc), carries white text at ≥5:1.
- **Cut Blue Text** (#60A5FA): accent as text or icon on graphite (selected tabs, active nav, selected chips, focus ring).

### Neutral
- **Monitor Black** (#0F1012): ground behind the scene and program monitors.
- **Graphite Ground** (#131417): app background.
- **Toolbar Graphite** (#17181B) and **Panel Graphite** (#1A1B1F): panels, toolbars, cards.
- **Raised Graphite** (#1E1F23): top bar and secondary buttons.
- **Hairline** (#303237): every divider and panel border, 1px.
- **Ink** (#E8E9EC): primary text. **Ink Muted** (#A9ADB4): secondary text and labels.

### Functional
- **Track hues**: video (#38BDF8), captions (#FCD34D), voice (#34D399), effects (#C084FC), music (#22D3EE); waveforms use desaturated voice (#2F7D61) and music (#2B6F7A) so they never outshine the clips.
- **Status**: ready (#34D399), processing (#FBBF24), failed (#F87171).
- **Playhead Red** (#EF4444) and **Danger** (#DC2626): the playhead and destructive actions, nothing else.

### Named Rules
**The One Blue Rule.** Solid Cut Blue appears once per view, on the primary action. Every other accent use is a 15% tint with Cut Blue Text.
**The Track Hue Fence.** Track hues never leave the timeline; panels, buttons and chips stay graphite and blue.

## Typography

**Body Font:** Inter (Vietnamese subset, with ui-sans-serif fallback)
**Mono Font:** JetBrains Mono, only for timecodes, durations and measurements

**Character:** A workhorse UI sans that disappears into the task, paired with a tabular mono that keeps numbers still.

### Hierarchy
- **Headline** (700, 24px, 1.2): page title on the dashboard only.
- **Title** (600, 18px, 1.25): section titles (Tạo dự án mới, Dự án của bạn).
- **Body** (400, 14px, 1.45): form text, descriptions, list titles.
- **Label** (500, 12px, 1.4): every control, tab, chip, track header and panel label in the editor.
- **Timecode** (500, 12px, tabular): rulers, durations, in/out points, the playhead readout (13px in the track-header readout).

### Named Rules
**The 12px Floor.** No functional text below 12px, anywhere.

## Layout

Editor: a 48px top bar, then resizable panels: Media Pool (~20%), scene and program monitors (centre, dual or single), Inspector (~24%), and the timeline across the bottom (~34% height) with a 28px ruler and 128px labelled track headers. The editor requires ≥1024px; narrower screens get a notice instead of a broken layout. Dashboard: max-width 1280px, create form (7/12) beside the project list (5/12), collapsing to one column on phones with a drawer sidebar. Spacing follows a 4px rhythm (4/8/12/16/24).

## Elevation & Depth

Flat by default: depth comes from tonal steps of the graphite ramp and 1px hairlines, not shadows. Shadows appear only on floating layers (menus, dialogs, toasts, the command palette) and on the program monitor frame, always with offset and blur, never as a coloured halo.

### Named Rules
**The No-Glow Rule.** No zero-offset coloured shadows or glowing text in chrome; caption styling inside the rendered video is content, not chrome.

## Shapes

Gently rounded: 4px for chips and timeline clips, 6px for buttons and inputs, 8px for panels and nav items, 12px for dashboard cards. Borders are 1px hairlines; no coloured side stripes.

## Components

### Buttons
- **Shape:** gently rounded (6px), 28px tall in the editor.
- **Primary:** Cut Blue fill, white label; one per view.
- **Secondary:** Raised Graphite fill, Ink label (Tạo mới, Thêm cảnh).
- **Ghost / icon:** transparent, Ink Muted icon, Raised Graphite on hover; every icon-only button has an aria-label.
- **Focus:** 2px Cut Blue Text outline, 1px offset.

### Chips & Segmented Controls
- **Idle:** Raised Graphite fill, Ink Muted label.
- **Selected:** 15% Cut Blue tint, Cut Blue Text label, semibold (zoom presets, aspect presets, workspace switch, word chips).

### Inputs / Fields
- **Style:** Panel Graphite fill, 1px hairline, 6px radius; placeholder in Ink Muted.
- **Focus:** Cut Blue Text ring.

### Navigation
- **Sidebar:** graphite rail; active item is a 15% blue tint with Cut Blue Text; project rows show a status icon in status colour and a tabular duration.

### Timeline
- **Clips:** 4px radius, track-hue tint and border; the selected clip gains a Cut Blue Text ring and a solid blue scene-number badge.
- **Playhead:** 1px Playhead Red line with a pentagon head in the ruler; snapping draws a yellow guide.
- **Locked track:** hatched overlay, pointer blocked.

## Do's and Don'ts

### Do:
- **Do** keep the primary action solid Cut Blue (#2563EB) and everything else tinted.
- **Do** set timecodes and durations in JetBrains Mono with tabular figures.
- **Do** use Lucide icons at 14–16px with a consistent stroke.
- **Do** keep secondary text at Ink Muted (#A9ADB4) or brighter.

### Don't:
- **Don't** use emoji as icons in chrome (user-entered titles are content and stay as typed).
- **Don't** introduce a second accent colour or reuse track hues outside the timeline.
- **Don't** add coloured glows, gradient text or coloured side stripes.
- **Don't** set functional text below 12px.
