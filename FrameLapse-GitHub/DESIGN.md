# FrameLapse visual direction

The final redesign is built exclusively around the selected relaxed-sketching illustration. It uses a light paper workspace rather than a dark dashboard, while interface wording remains focused on recording, privacy, and time.

## Palette

- Paper: `#FFFDF9`
- Warm canvas: `#F2ECE5`
- Hoodie crimson: `#CA2E50`
- Hair gold: `#F2C665`
- Eye blue: `#269DCC`
- Pencil ink: `#29262B`

## Generated assets

- `public/character-sketching.png`: selected Option 4 and the only full character artwork shipped in the app.
- `public/icon.png`: the recreated circular motion symbol based on the supplied reference, used in the app, tray, and title bar.
- `public/icon-screenshots.png`: approved paper-stack and pencil metric icon.
- `public/icon-video-length.png`: approved stopwatch and play metric icon.
- `public/icon-storage.png`: approved archive and drive metric icon.
- `public/icon-monitor-source.png`: approved monitor and capture-frame icon.
- `public/icon-kunai.png`: approved three-pronged kunai empty-state icon.
- `public/icon-settings.png`: approved hand-drawn gear icon.
- `build/icon.ico`: Windows executable, installer, and Desktop shortcut icon generated from the recreated symbol.
- Rejected earlier concepts were moved out of the packaged source to `outputs/rejected-art-archive`.

## Selected generation direction

Built-in ImageGen was used. The supplied Option 4 image was treated as the palette, medium, and calm-character reference. The artwork uses hand-drawn colored-pencil and alcohol-marker texture, blond hair, blue eyes, crimson and ivory clothing, and generous white space. No interface copy uses Naruto names or terminology.

The app icon prompt requested a simplified close head-and-shoulders portrait derived from Option 4, retaining the relaxed expression, pencil, blond hair, blue eyes, crimson hoodie, ivory paper, and pale-blue accent ring. It excludes text, logos, franchise insignia, glow, and speed effects.

## UI system

Record blends the sketching illustration directly into a white-paper capture surface. Library sessions use clean numbered cards; Settings uses grouped paper panels. Crimson drives primary actions, gold marks captured frames, blue marks timing and local status, and pencil-gray carries text. Motion is limited to a small recording pulse so the interface remains light while Blender is running.

## Typography

The clean-modern system uses Segoe UI Variable Text for body copy, controls, labels, and buttons, with Segoe UI Variable Display for headings, timers, and numeric session markers. No handwritten or editorial font substitutions are used.
