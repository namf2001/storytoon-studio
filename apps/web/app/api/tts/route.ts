import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "Mai Anh" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const publicDir = path.join(process.cwd(), "public", "product-trashcan");
    const scriptPath = path.join(process.cwd(), "scripts", "synthesize_product.py");
    const pythonBin = path.join(process.cwd(), "..", "ai-worker", ".venv", "bin", "python");

    const { stdout, stderr } = await execFileAsync(pythonBin, [
      scriptPath,
      "--text",
      text,
      "--voice",
      voice,
      "--output-dir",
      publicDir,
    ]);

    if (stderr && !stdout) {
      console.error("TTS Script stderr:", stderr);
      return NextResponse.json({ error: stderr }, { status: 500 });
    }

    const result = JSON.parse(stdout.trim());
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("TTS generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate TTS" },
      { status: 500 }
    );
  }
}
