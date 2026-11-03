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

## FrameLapse vs. normal screen recording

| Comparison | FrameLapse | Normal screen recorder |
|---|---|---|
| Capture method | Takes screenshots at a selected interval | Records continuous video |
| Best suited for | Blender, drawing, coding, editing, and long creative workflows | Tutorials, meetings, gameplay, and live demonstrations |
| Long recordings | Compresses hours of work into a short timelapse | Produces a video close to the original session length |
| Storage usage | Usually lower | Usually higher |
| System load | Lower capture frequency can reduce resource usage | Continuously uses CPU, GPU, and disk resources |
| Final video | Fast progress-style timelapse | Real-time video |
| Audio | Not recorded | Usually supports system and microphone audio |
| Pause and resume | Supported | Usually supported |
| Session recovery | Stores recoverable sessions locally | Depends on the application |
| Screenshot access | Individual captured frames remain available | Individual frames are not normally stored |
| MP4 export | Created locally using bundled FFmpeg | Usually created by the recorder |
| Internet connection | Not required | Depends on the application |
| Cloud account | Not required | Sometimes required |
| Telemetry | None | Depends on the application |
| Automatic uploads | None | May be available or enabled in some applications |
| Best choice when | You want to show hours of progress quickly | You need real-time motion, narration, or audio |
