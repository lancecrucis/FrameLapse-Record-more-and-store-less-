# Reference review and design decisions

Inspected TimeLapser commit `32d6ee10731960974726d44339cf33e2b9d360d9` from https://github.com/ImagineTheGames/TimeLapser, including README, GPL-3.0 LICENSE, package.json/lockfile, Electron main/preload, region picker, React UI, Vite configuration, build and screenshot helper patch scripts.

Upstream uses Electron + React + TypeScript + Vite, screenshot-desktop for interval-based monitor capture, Sharp for crop/resize/encoding, electron-store for settings, and FFmpeg for video assembly. Session folders contain numbered frames and initial metadata. electron-builder supplies NSIS packaging.

Retained: desktop technology stack and packaging tools, local capture/Sharp pipeline architecture, monitor capture helper from screenshot-desktop, and upstream region picker/preload. Upstream GPL license and attribution are retained. FrameLapse has a newly tailored dashboard/library, revised capture/session/export orchestration and reduced runtime dependencies. There is no hosted UI and no development server in the installed app.

Reasons for revising the orchestration:

- Upstream's asynchronous capture callback consults mutable current-session state at completion. Rapid stop/start can associate an old capture with a new session. FrameLapse serializes capture, waits on stop/pause, and keeps a stable session reference.
- Upstream writes frames directly, so interruption can expose incomplete image files. FrameLapse commits a uniquely named temporary file before incrementing metadata and reconstructs ordering from committed filenames.
- Upstream's default temporary output is Pictures/TimeLapser and its settings use roaming app data. FrameLapse separates local sessions/settings from Videos exports.
- Upstream's UI polls recursive session size frequently. FrameLapse increments an in-memory byte count and reconciles on startup/resume.
- Upstream capture enumerates displays for each frame. FrameLapse caches known monitor identities, refreshes for display selection, and handles display removal with a pause. Native capture and encoding run outside the renderer.
- Upstream has system-FFmpeg fallback and many social/GIF export branches. This brief needs bundled local H.264 MP4 with progress and stringent verification, so the export path is narrowed and audited.

The screenshot-desktop helper is precompiled and launched directly, eliminating its runtime shell/batch compilation and temporary executable directory. The helper no longer silently falls back to a different display if a requested monitor disappears. Its original source reference and MIT attribution are included.
