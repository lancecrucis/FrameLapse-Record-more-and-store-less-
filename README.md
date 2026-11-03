# FrameLapse

FrameLapse is a completely local, offline-first screen timelapse recorder for Windows 11. It captures screenshots at a chosen interval and converts them into an MP4 video using bundled FFmpeg tools.

No account, subscription, cloud service, telemetry, automatic updates, or internet connection is required after installation.

<img width="1046" height="782" alt="image" src="https://github.com/user-attachments/assets/f352b47b-ce83-41c4-9925-5fe20b132381" />


## Download and install

1. Open the [latest FrameLapse release](../../releases/latest).
2. Under **Assets**, download `FrameLapse-Setup-1.0.0.exe`.
3. Double-click the installer.
4. Launch **FrameLapse** using the Desktop shortcut.

FrameLapse includes its own local FFmpeg tools. You do not need to install FFmpeg, Node.js, VS Code, Codex, or other development software.

> Windows may display a SmartScreen warning because the installer is currently unsigned. Confirm that it was downloaded from this repository before running it.

## Why FrameLapse instead of a normal screen recorder?

Traditional screen recorders capture every moment as continuous video. FrameLapse captures individual screenshots at a chosen interval and turns them into a timelapse video.

| Feature | FrameLapse | Normal screen recorder |
|---|---|---|
| Recording method | Captures screenshots at intervals | Captures continuous video |
| Best for | Long creative workflows, Blender projects, drawing, coding, and progress videos | Tutorials, meetings, gaming, and real-time demonstrations |
| Storage usage | Usually much lower during long sessions | Usually grows quickly |
| Performance impact | Lower capture frequency can reduce system load | Continuous recording can use more CPU, GPU, and disk resources |
| Final video length | Compresses hours of work into a short timelapse | Usually matches the original recording duration |
| Privacy | Completely local with no telemetry or uploads | Depends on the recorder |
| Internet required | No | Depends on the recorder |
| Session recovery | Recording sessions remain available locally | Depends on the recorder |
| Audio recording | No | Usually supported |
| Real-time playback | Not intended for real-time playback | Yes |

### FrameLapse is especially useful for

- Recording hours of Blender modeling without producing an extremely long video
- Creating short progress videos from long creative sessions
- Reducing storage use compared with continuous screen recording
- Capturing work while minimizing interruptions
- Pausing and resuming a project across multiple sessions
- Keeping screenshots and finished videos completely local

FrameLapse is a timelapse recorder, not a replacement for every traditional screen recorder. Use a normal screen recorder when you need real-time motion, narration, system audio, or microphone recording.
