// Usage:
//   1) node scripts/render.mjs --props <props.json> --comp <FootballShortVideo|StoryVideo> --out <output.mp4>
//   2) node scripts/render.mjs <projectId> [16:9|9:16]
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const propsFile = getArg("--props");
const compIdArg = getArg("--comp");
const outArg = getArg("--out");

let compId = compIdArg || "StoryVideo";
let inputProps;
let outputLocation;

const storageDir = path.resolve(__dirname, "../../../storage");

if (propsFile) {
  inputProps = JSON.parse(fs.readFileSync(propsFile, "utf-8"));
  outputLocation =
    outArg ||
    path.join(storageDir, "renders", `render_${Date.now()}.mp4`);
} else {
  const [projectId, ratioArg] = args;
  if (!projectId) {
    console.error("Usage: node scripts/render.mjs <projectId> [16:9|9:16]");
    process.exit(1);
  }
  const API = process.env.API_URL ?? "http://localhost:9090";
  const res = await fetch(`${API}/api/v1/projects/${projectId}`);
  const body = await res.json();
  const project = body.data;
  const aspectRatio = ratioArg ?? project.aspectRatio;
  inputProps = {
    audioUrl: project.audioUrl,
    durationMs: project.durationMs,
    aspectRatio,
    words: project.words,
    scenes: project.scenes,
  };
  const outDir = path.join(storageDir, projectId);
  fs.mkdirSync(outDir, { recursive: true });
  outputLocation = path.join(outDir, `video_${aspectRatio.replace(":", "x")}.mp4`);
}

fs.mkdirSync(path.dirname(outputLocation), { recursive: true });

console.log(`Bundling Remotion composition: ${compId}...`);
const serveUrl = await bundle({
  entryPoint: path.resolve(__dirname, "../src/entry.ts"),
});

const renderPort = 3400 + Math.floor(Math.random() * 500);

const composition = await selectComposition({
  serveUrl,
  id: compId,
  inputProps,
  port: renderPort,
});

console.log(
  `Rendering ${compId} (${composition.width}x${composition.height}, ${composition.durationInFrames} frames @ ${composition.fps}fps) -> ${outputLocation}`
);

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation,
  inputProps,
  port: renderPort,
  onProgress: ({ progress }) => {
    process.stdout.write(`\rPROGRESS:${Math.round(progress * 100)}`);
  },
});

console.log(`\nDONE:${outputLocation}`);
