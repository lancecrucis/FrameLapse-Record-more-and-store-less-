# FrameLapse for Windows 11

A local desktop timelapse recorder based on ImagineTheGames/TimeLapser. No account, subscription, hosted service, local web server, telemetry, update checks, or internet connection is required. GPL-3.0-only; see `LICENSE` and `NOTICE.md`. See `ASSET-NOTICE.md` before redistributing the visual theme.

## Install on Windows 11

1. Open the repository's [Releases page](../../releases/latest).
2. Download `FrameLapse-Setup-1.0.0.exe` from the latest release's **Assets** section.
3. Double-click the downloaded installer. No account or internet connection is required after the download.
4. Launch **FrameLapse** from the Desktop shortcut.

FrameLapse includes its own local FFmpeg tools, so ordinary users do not need to install FFmpeg, Node.js, VS Code, or any development software. Windows may display a SmartScreen warning because the installer is currently unsigned; verify that it came from this repository before running it. The application installs for the current Windows user and does not request administrator privileges.

The files shown on the repository's main page are the source code. Users who only want to record should download the installer from **Releases**, not the source ZIP.

## Everyday use

1. Double-click **FrameLapse** on the Desktop.
2. Choose **Settings** if you want a different monitor, capture region, interval, or output format. Click **Save Settings**.
3. Click **Start Recording**, then work in Blender normally. Minimize or close the window to send it to the system tray; recording continues. Double-click the tray icon to restore the window.
4. Click **Pause** / **Resume** when needed. Click **Stop Recording** to finish. Automatic MP4 export is enabled by default.
5. Wait for **Video ready**. Click **Open Video** or **Open Folder**. Success is reported only after encoding, frame count/duration checks, and complete video decoding.

Defaults: one JPEG every 3 seconds, JPEG quality 85, native capture resolution, 1080p H.264 MP4 at 30 FPS, CRF 20. One hour of active recording at these defaults becomes about 40 seconds of video. No audio is recorded.

## Locations

- Installed portable executable: `%USERPROFILE%\Desktop\FrameLapse\FrameLapse.exe`
- Desktop shortcut: `%USERPROFILE%\Desktop\FrameLapse.lnk`
- Default finished videos: `%USERPROFILE%\Videos\FrameLapse`
- Settings: `%LOCALAPPDATA%\FrameLapse\settings.json`
- Session screenshots and metadata: `%LOCALAPPDATA%\FrameLapse\sessions\<unique-id>`
- Electron's local UI cache: `%LOCALAPPDATA%\FrameLapse\browser`

Desktop and Videos are resolved using Windows known-folder APIs, including redirection. Video output can be changed to another local folder in Settings. Sessions are never stored beside the executable. Keep the portable folder's files together.

## Recording Library and recovery

Every recording has a UUID. Frames have monotonically increasing filenames and are committed through a temporary file and rename. The app finishes any in-flight capture before stopping. At startup it reconciles metadata with committed frames; incomplete `.part` files are ignored and left untouched. Interrupted recordings appear as **recovered**. Use **Resume session** to append with its original capture settings, or **Export MP4** to use the current video export settings.

Deleting a session always asks for confirmation and leaves exported MP4 files alone. Optional post-export screenshot cleanup is off by default. If enabled, it asks after each successful export; deleting screenshots prevents resuming or re-exporting that session. No existing data is automatically deleted.

## Settings and performance

- Intervals: 1, 2, 3, 5, 10, or 30 seconds. Capture occurs only at that cadence, with one capture in flight. Slow capture or disk I/O can reduce the effective rate; missed frames are not queued in RAM.
- JPEG quality 30–100, or lossless PNG. Capture scale 25%, 50%, 75%, or native, preserving aspect ratio.
- Choose any detected monitor, or draw a region **within one selected monitor**. Region coordinates are converted from window logical units to that monitor's physical pixels.
- Export: 720p/1080p/1440p/2160p, 24/30/60 FPS, four H.264 quality choices. Different aspect ratios are letterboxed, not stretched.
- Idle detection is off by default. If enabled, capture pauses after 30–3600 seconds of no input and resumes when activity returns. Leave it disabled for Blender rendering.
- FFmpeg encoding uses two threads, the `veryfast` preset and below-normal process priority. Images are read incrementally. Only the current capture is held in memory; Sharp's cache and worker count are limited.
- Windows sleep pauses recording. Resume manually after waking. Locked desktops, UAC secure desktops, protected content and some exclusive fullscreen surfaces cannot reliably be captured. Windowed Blender is the intended workflow.
- A 128 MiB free-space reserve stops new capture; export also checks for free space. Large sessions still need enough space for the resulting MP4. Disk-full errors preserve frames.

## Offline operation

The packaged Electron window loads bundled local files. Network requests are blocked at the Electron session layer, remote navigation/popups are denied, Content Security Policy has `connect-src 'none'`, and background networking/component updates/sync/pings are disabled. Application code contains no HTTP client, upload, analytics, update mechanism, or listening server. The packaged binaries are launched by absolute local paths, without shell command interpolation. FFmpeg input is restricted to local file/pipe protocols.

The built-in self-test puts the Electron session in offline mode while capturing and exporting. Physical unplugging of the PC's network connection is a separate manual test; the application does not need or consult the network.

## Troubleshooting

- **No frames / capture paused:** unlock Windows, check that the selected monitor is connected, and Resume. Three repeated capture failures pause the session and display an error.
- **Low disk space:** free space on the session drive or output drive. Your existing frames remain. Resume or retry export from the library.
- **Export failed:** the visible error contains FFmpeg's failure details. Original frames and any partial output are kept. Correct the problem and retry; every attempt gets a unique filename. Only completed, verified `.mp4` files are added to the library's Open Video action. Files ending `.partial.mp4` are incomplete attempts.
- **Window disappeared:** check the notification-area overflow for the green FrameLapse icon. Closing or minimizing the window keeps the app running. Use **Quit FrameLapse** to exit; active recording requires confirmation.
- **Video opens briefly:** a few screenshots at 30 FPS make a very short video. Record longer for a useful timelapse.
- **Unsigned application:** this private build has no purchased code-signing certificate. No administrator privileges are requested. Keep Windows security protections enabled.

## Build from the included source

The installed app needs no Node, npm, VS Code, Codex or terminal. Development only: Node.js 22+, npm, and Windows 11. This source includes its compiled capture helper and helper source. `npm ci` downloads build dependencies, so development may need internet. The helper targets Windows' built-in .NET Framework 4.x, not a separately installed SDK.

Before building, add Windows x64 copies of `ffmpeg.exe` and `ffprobe.exe` to the `tools` folder. They are intentionally excluded because each binary exceeds GitHub's 100 MB file limit. See `tools/README.md` for the required paths and redistribution notes.

```powershell
npm ci
npm run build
npm run pack
npm run dist
```

`npm run build` type-checks both processes and builds the local renderer. `npm run pack` creates `../FrameLapse-build/win-unpacked`. `npm run dist` additionally creates a per-user NSIS installer. The supplied Desktop installation script installs the portable build without overwriting existing files.

To rebuild the native capture helper, run `scripts/build-capture.ps1`. To test a packaged app, run `scripts/run-tests.js` with Node, or use the packaged executable with `--self-test` and a dedicated `FRAMELAPSE_TEST_DATA` environment variable. Test sessions remain separate from your real recordings. The test suite records the visible screen locally; it never uploads it.

## Limitations / manual validation

The automated tests cover one monitor available on this PC. Mixed-DPI multiple monitors, hours-long Blender sessions, Windows sleep/lock and shutdown behavior, and a physically disconnected network require longer manual validation. Region selection is limited to one monitor; cross-monitor composite regions are not offered. Electron is retained to respect the upstream architecture, so its baseline memory/disk footprint is higher than a small native-only recorder.

No installer is required for the Desktop portable installation. If using the optional installer later, avoid running two separate installed copies; the normal application enforces one instance per user.
