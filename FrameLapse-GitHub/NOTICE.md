# FrameLapse notices

FrameLapse is a modified derivative of TimeLapser by ImagineTheGames, licensed GPL-3.0-only.
Reference: https://github.com/ImagineTheGames/TimeLapser
The Electron/React/Vite/electron-builder architecture, region picker HTML/preload and capture approach are retained. Recording/session/export orchestration and UI were substantially revised for reliability, local-only storage and this brief.

The capture helper derives from screenshot-desktop 1.15.4 (MIT), included as source in tools/capture.cs, with its upstream reference comments preserved. Its fallback to a different monitor was replaced with an error. See licenses for notices.

The release installer may include unmodified Gyan Windows full build 8.1.2 FFmpeg and FFprobe binaries for independent offline execution. See licenses/FFmpeg-LICENSE.txt and FFmpeg-README.txt for license and upstream build/source details. FFmpeg is a separate command-line process, not dynamically linked. Distributors of release binaries are responsible for supplying the exact corresponding FFmpeg source and all required dependency licenses under the applicable GPL terms.

No update service, telemetry, account, remote API, network server, or external content is used by FrameLapse.
