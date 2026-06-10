# Note Timer

Track time spent on notes with start/stop timer for Obsidian. Auto-updates frontmatter properties.

## Features

- **Start/Stop Timer** — Track time spent on any note
- **Extra Time** — Add minutes for offline work
- **Log Now** — Insert formatted timestamp at cursor
- **Auto Properties** — Updates `start_time`, `end_time`, `total_time`, `done` in frontmatter
- **Configurable** — Custom property names to fit your workflow
- **Inline Buttons** — Embed timer controls in notes with code blocks

## Installation

### Manual
1. Download `main.js`, `manifest.json`, `styles.css` from releases
2. Create folder `.obsidian/plugins/note-timer/`
3. Copy files into the folder
4. Enable plugin in Settings → Community plugins

## Usage

### Commands & Hotkeys

| Command | Hotkey | Description |
|---------|--------|-------------|
| Start Timer | `Ctrl+Shift+S` | Start tracking time |
| Stop Timer | `Ctrl+Shift+X` | Stop and calculate duration |
| Add Extra Time | `Ctrl+Shift+E` | Add manual minutes |
| Log Now | `Ctrl+Shift+N` | Insert timestamp |

### Ribbon Icons

- ▶️ Start Timer
- ⏹️ Stop Timer  
- ➕ Add Extra Time
- ✏️ Log Now

### Inline Timer Buttons

Add a code block in your note:

````markdown
```timer
```
````

This renders Start/Stop/Extra buttons directly in your note.

## Frontmatter

When you start and stop a timer:

```yaml
---
start_time: 2026-06-09T09:00:00
end_time: 2026-06-09T10:30:00
timed: 90
extra: 15
total_time: 105
done?: true
---
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Timed property | `timed` | Auto-tracked minutes |
| Extra property | `extra` | Manual added minutes |
| Total time property | `total_time` | timed + extra |
| Start time property | `start_time` | Timer start datetime |
| End time property | `end_time` | Timer stop datetime |
| Done property | `done?` | Set true when stopped |
| Log Now format | `- YYYY-MM-DD HH:mm \| ` | Timestamp format |

## Workflow Example

1. Open a task note
2. Press `Ctrl+Shift+S` to start timer
3. Work on the task
4. Press `Ctrl+Shift+X` to stop
5. Frontmatter auto-updates with time spent

For offline work (meetings, research), use `Ctrl+Shift+E` to add extra minutes.

## License

MIT
