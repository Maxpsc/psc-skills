---
name: psc-chrome-icon
description: Generate Chrome extension icons from text descriptions. Use when user asks to create, generate, or design a Chrome extension icon, browser plugin icon, or favicon. Supports multiple sizes (16, 48, 128px) required for Chrome Web Store.
version: 0.1.0
---

# Chrome Extension Icon Generator

Generate Chrome extension icons from text descriptions using AI image generation.

## Script Directory

**Agent Execution**:
1. `{baseDir}` = this SKILL.md file's directory
2. Script path = `{baseDir}/scripts/main.ts`
3. Resolve `${BUN_X}` runtime: if `bun` installed → `bun`; if `npx` available → `npx -y bun`; else suggest installing bun

## Usage

```bash
# Generate icons from description
${BUN_X} {baseDir}/scripts/main.ts --prompt "A modern blue robot icon" --output ./icons

# Specify output directory
${BUN_X} {baseDir}/scripts/main.ts --prompt "A minimalist dark theme icon" --output ./my-extension/icons
```

## Output

Generates the following files in the output directory:
- `icon16.png` - 16x16 pixels (toolbar)
- `icon48.png` - 48x48 pixels (extensions page)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## manifest.json Icons Configuration

After generation, add to your `manifest.json`:

```json
"icons": {
  "16": "icon16.png",
  "48": "icon48.png",
  "128": "icon128.png"
}
```

## Tips for Good Chrome Icons

1. **Simple designs work best** - Icons are small, especially at 16px
2. **High contrast** - Ensure visibility at all sizes
3. **Transparent background** - Use PNG with transparency
4. **Consistent style** - Chrome Web Store requires unified icon style
5. **No text at small sizes** - Text is illegible below 48px

## Integration with baoyu-imagine

This skill uses `baoyu-imagine` for AI image generation. Ensure `baoyu-imagine` is configured with your preferred provider before use.
