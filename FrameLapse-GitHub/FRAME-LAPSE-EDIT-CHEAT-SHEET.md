# FrameLapse manual design edit cheat sheet

Edit this source project, not an installed Desktop copy.

## Main style file

Open `src\style.css`.

### Recorder overlay fixes

- READY / RECORDING sign: search for `.image-shell .status-sign`.
  - `top` moves it up/down.
  - `right` moves it left/right.
  - `font-size` changes the label size.
  - `padding-bottom` moves the text slightly upward/downward.

- Display/source card: search for `.image-shell .capture-card` and `.image-shell .change-link`.
  - `margin-left` moves the card.
  - `width` changes the card span.
  - `padding` changes the text breathing room.
  - `border-left: 0` keeps the artwork divider from being drawn twice.

- Start / Pause / Stop controls: search for `.image-shell .recording-controls`.
  - `grid-template-columns` changes each button width.
  - `gap` changes spacing between buttons.
  - `margin-left` moves the whole row.
  - `min-height` changes button height.
  - `font-size` changes button text size.

### Left sidebar footer

Search for `.image-shell .sidebar-actions`.

- `padding` moves the footer content inside the painted panel.
- `font-size` changes Minimize and Quit text.
- `.image-shell .sidebar-actions .art-icon` controls the Quit icon size.
- `.image-shell .sidebar-actions button > span` controls the Minimize dash.

## Text and button labels

Open `src\App.tsx`.

- READY / RECORDING / PAUSED labels: search for `function StatusSign`.
- Minimize and Quit labels: search for `<div className="sidebar-actions">`.
- Display name and Change button: search for `className="capture-card"`.
- Start, Pause, and Stop labels: search for `className="recording-controls"`.

## Text layout controls

These CSS properties are the ones you will use most often:

- `font-size`: make text larger or smaller.
- `font-weight`: make text lighter or bolder. Common values are `400`, `600`, and `800`.
- `line-height`: move text vertically inside its box. Try `1`, `1.1`, or `1.2`.
- `letter-spacing`: add or remove space between letters.
- `text-align`: use `left`, `center`, or `right`.
- `padding`: adds space inside the element; changing top/bottom changes text placement.
- `margin`: moves the element relative to nearby elements.
- `transform: translate(x, y)`: make a small visual adjustment. Example: `translateY(-2px)` moves text up 2 pixels.
- `align-items`: vertical alignment inside a flex row. Use `center` for centered text.
- `justify-content`: horizontal alignment inside a flex row. Use `center` for centered text.

Useful text rules:

```css
/* READY sign text */
.image-shell .status-sign {
  font-size: 13px;
  line-height: 1;
  letter-spacing: 1.1px;
  padding-bottom: 3px;
}

/* Display name */
.image-shell .source-copy b {
  font-size: 14px;
  line-height: 1.2;
}

/* Display details */
.image-shell .source-copy p {
  font-size: 10px;
  line-height: 1.2;
}

/* Start / Pause / Stop labels */
.image-shell .recording-controls button {
  font-size: 13px;
  line-height: 1;
  text-align: center;
  justify-content: center;
}

/* Minimize / Quit labels */
.image-shell .sidebar-actions button {
  font-size: 13px;
  line-height: 1;
}
```

Quick adjustments:

- Text too low: reduce `padding-bottom`, or use `transform: translateY(-2px)`.
- Text too high: increase `padding-bottom`, or use `translateY(2px)`.
- Text too wide: reduce `font-size` or `letter-spacing`.
- Text too cramped: increase `line-height` or vertical `padding`.
- Text not centered: set `display: flex; align-items: center; justify-content: center;`.

## Background artwork

Replace these files in `public\konoha\`:

- `framelapse-bg-record.png`
- `framelapse-bg-library.png`
- `framelapse-bg-settings.png`

Keep the same filenames so the app continues to load them.

## Applying your changes

After editing, run these commands from the source folder:

```powershell
npm run build
npx electron-builder --dir
```

Then copy the contents of:

`..\FrameLapse-build\win-unpacked`

into:

`%USERPROFILE%\Desktop\FrameLapse`

The Desktop shortcut launches the packaged copy in `%USERPROFILE%\Desktop\FrameLapse`, not the source folder.

## Safe workflow

1. Change one or two CSS values.
2. Save the file.
3. Build and copy the updated package.
4. Open FrameLapse and check the result.
5. Keep a backup of `src\style.css` before larger edits.
