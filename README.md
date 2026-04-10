# psc-skills

Personal Claude skills plugin for daily work efficiency.

## Skills

| Skill | Description |
|-------|-------------|
| [psc-chrome-icon](skills/psc-chrome-icon/) | Generate Chrome extension icons from text descriptions using AI image generation |

## Installation

Add to your Claude Code `settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "psc-skills": {
      "source": {
        "source": "local",
        "path": "/path/to/psc-skills"
      }
    }
  }
}
```

Or use a GitHub source:

```json
{
  "extraKnownMarketplaces": {
    "psc-skills": {
      "source": {
        "source": "github",
        "repo": "your-username/psc-skills"
      }
    }
  }
}
```

## Development

This plugin follows the Claude skills plugin structure:

- `.claude-plugin/marketplace.json` - Plugin metadata
- `skills/` - Individual skill directories
- `skills/<name>/SKILL.md` - Skill documentation
- `skills/<name>/scripts/main.ts` - Skill execution script
