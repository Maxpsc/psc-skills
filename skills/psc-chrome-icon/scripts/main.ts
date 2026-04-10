#!/usr/bin/env bun
/**
 * Chrome Extension Icon Generator
 * Generates multiple icon sizes from a text description using baoyu-imagine
 */

import { parseArgs } from "node:util";
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { homedir } from "node:os";

const ICON_SIZES = [16, 48, 128];
const __dirname = dirname(fileURLToPath(import.meta.url));

interface CliArgs {
  prompt?: string;
  output?: string;
  provider?: string;
  model?: string;
}

function printUsage(): void {
  console.log(`Usage:
  bun scripts/main.ts --prompt "A blue robot icon" --output ./icons

Options:
  -p, --prompt <text>       Icon description (required)
  -o, --output <path>      Output directory (required)
  --provider <name>         AI provider (google, openai, openrouter, dashscope, etc.)
  -m, --model <id>         Model ID
`);
}

async function resolveBunX(): Promise<string> {
  try {
    const { execSync } = await import("node:child_process");
    execSync("bun --version", { stdio: "pipe" });
    return "bun";
  } catch {
    return "npx -y bun";
  }
}

async function callBaoyuImagine(
  prompt: string,
  outputPath: string,
  provider?: string,
  model?: string,
  bunX: string = "bun"
): Promise<boolean> {
  const baoyuImaginePath = join(
    homedir(),
    ".claude/plugins/marketplaces/baoyu-skills/skills/baoyu-imagine/scripts/main.ts"
  );
  const args = [
    baoyuImaginePath,
    "--prompt",
    prompt,
    "--image",
    outputPath,
  ];

  if (provider) {
    args.push("--provider", provider);
  }
  if (model) {
    args.push("--model", model);
  }

  return new Promise((resolve) => {
    const proc = spawn(bunX, args, {
      stdio: "inherit",
      cwd: __dirname,
    });
    proc.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

async function resizeImage(
  inputPath: string,
  outputPath: string,
  size: number,
  bunX: string = "bun"
): Promise<void> {
  const { spawn } = await import("node:child_process");

  return new Promise((resolve, reject) => {
    const proc = spawn(
      bunX,
      [
        "-e",
        `const sharp = require('sharp'); const input = process.argv[1]; const size = parseInt(process.argv[2]); const output = process.argv[3]; sharp(input).resize(size, size).png().toFile(output).catch(e => { console.error(e); process.exit(1); });`,
        inputPath,
        size.toString(),
        outputPath,
      ],
      { stdio: "inherit" }
    );
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Resize failed with code ${code}`));
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      prompt: { type: "string", short: "p" },
      output: { type: "string", short: "o" },
      provider: { type: "string" },
      model: { type: "string", short: "m" },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const args = values as CliArgs;

  if (args.help || !args.prompt || !args.output) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const outputDir = args.output;
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const bunX = await resolveBunX();
  console.log(`Using runtime: ${bunX}`);

  // Step 1: Generate base image at 512x512 using baoyu-imagine
  const baseImagePath = join(outputDir, "_base_icon.png");
  console.log(`Generating base icon: ${args.prompt}`);

  const success = await callBaoyuImagine(
    args.prompt + " (Chrome extension icon, PNG format, fill the entire frame with no empty space/padding, edge-to-edge square composition, simple clean design, high contrast)",
    baseImagePath,
    args.provider,
    args.model,
    bunX
  );

  if (!success) {
    console.error("Failed to generate base image");
    process.exit(1);
  }

  // Step 2: Resize to all required sizes
  console.log("Resizing to required sizes...");
  for (const size of ICON_SIZES) {
    const outputPath = join(outputDir, `icon${size}.png`);
    console.log(`  Creating icon${size}.png...`);

    try {
      await resizeImage(baseImagePath, outputPath, size, bunX);
    } catch (e) {
      console.error(`Failed to create icon${size}.png:`, e);
      // Fallback: copy base if resize fails
      try {
        writeFileSync(outputPath, readFileSync(baseImagePath));
      } catch {}
    }
  }

  // Cleanup base image
  try {
    unlinkSync(baseImagePath);
  } catch {}

  console.log(`
Icon generation complete!

Files created in ${outputDir}:
  - icon16.png
  - icon48.png
  - icon128.png

Add to your manifest.json:
{
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
