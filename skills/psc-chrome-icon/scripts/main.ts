#!/usr/bin/env node
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
  npx -y node scripts/main.ts --prompt "A blue robot icon" --output ./icons

Options:
  -p, --prompt <text>       Icon description (required)
  -o, --output <path>      Output directory (required)
  --provider <name>         AI provider (google, openai, openrouter, dashscope, etc.)
  -m, --model <id>         Model ID
`);
}

function getVersionedPath(dir: string, filename: string): string {
  const ext = ".png";
  const base = filename.replace(ext, "");
  let version = 1;
  let outputPath = join(dir, filename);

  while (existsSync(outputPath)) {
    version++;
    outputPath = join(dir, `${base}_v${version}${ext}`);
  }

  return outputPath;
}

async function ensureSharp(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "npx",
      ["-y", "sharp", "--version"],
      { stdio: "pipe" }
    );
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.log("Installing sharp...");
        const installProc = spawn(
          "npx",
          ["-y", "npm", "install", "-g", "sharp"],
          { stdio: "inherit" }
        );
        installProc.on("close", (installCode) => {
          if (installCode === 0) resolve();
          else reject(new Error("Failed to install sharp"));
        });
      }
    });
  });
}

async function callBaoyuImagine(
  prompt: string,
  outputPath: string,
  provider?: string,
  model?: string
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
    const proc = spawn("npx", ["-y", "bun", ...args], {
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
  size: number
): Promise<void> {
  const { spawn } = await import("node:child_process");

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "npx",
      [
        "-y",
        "bun",
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

  console.log(`Using runtime: npx -y`);

  // Step 1: Generate base image using baoyu-imagine
  const baseImagePath = getVersionedPath(outputDir, "_base_icon.png");
  console.log(`Generating base icon: ${args.prompt}`);

  const success = await callBaoyuImagine(
    args.prompt + " (Chrome extension icon, PNG format, fill the entire frame with no empty space/padding, edge-to-edge square composition, simple clean design, high contrast)",
    baseImagePath,
    args.provider,
    args.model
  );

  if (!success) {
    console.error("Failed to generate base image");
    process.exit(1);
  }

  // Step 2: Resize to all required sizes
  console.log("Resizing to required sizes...");
  const createdFiles: string[] = [];
  for (const size of ICON_SIZES) {
    const iconPath = getVersionedPath(outputDir, `icon${size}.png`);
    console.log(`  Creating ${iconPath}...`);

    try {
      await resizeImage(baseImagePath, iconPath, size);
      createdFiles.push(iconPath);
    } catch (e) {
      console.error(`Failed to create icon${size}.png:`, e);
      try {
        writeFileSync(iconPath, readFileSync(baseImagePath));
        createdFiles.push(iconPath);
      } catch {}
    }
  }

  // Cleanup base image
  try {
    unlinkSync(baseImagePath);
  } catch {}

  const fileList = createdFiles.map(f => `  - ${f}`).join("\n");
  const manifestIcons = ICON_SIZES.map(size => {
    const file = createdFiles.find(f => f.includes(`icon${size}`));
    const filename = file ? file.split("/").pop() : `icon${size}.png`;
    return `    "${size}": "${filename}"`;
  }).join(",\n");

  console.log(`
Icon generation complete!

Files created in ${outputDir}:
${fileList}

Add to your manifest.json:
{
  "icons": {
${manifestIcons}
  }
}
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
