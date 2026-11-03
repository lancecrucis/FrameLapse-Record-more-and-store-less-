// FrameLapse, derived from TimeLapser by ImagineTheGames. GPL-3.0-only.
import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, dialog, shell, screen, powerMonitor, session, Notification } from 'electron';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { atomicJSON, Sessions, Recorder, Settings, Session, exportSession, runProcess, frameNames } from './core';
const testMode = process.argv.includes('--self-test');
const data = testMode ? path.resolve(process.env.FRAMELAPSE_TEST_DATA || path.join(process.env.LOCALAPPDATA!, 'FrameLapse-test')) : path.join(process.env.LOCALAPPDATA!, 'FrameLapse');
fs.mkdirSync(data, { recursive: true });
app.setPath('userData', data); app.setPath('sessionData', path.join(data, 'browser')); app.setName('FrameLapse');
for (const flag of ['disable-background-networking', 'disable-component-update', 'disable-domain-reliability', 'disable-sync', 'no-pings']) app.commandLine.appendSwitch(flag);
app.disableHardwareAcceleration();
if (!testMode && !app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }
const assets = app.isPackaged ? path.join(process.resourcesPath, 'tools') : path.join(__dirname, '..', 'tools');
const ffmpeg = path.join(assets, 'ffmpeg.exe'), ffprobe = path.join(assets, 'ffprobe.exe');
const icon = path.join(__dirname, '..', 'public', 'icon.png');
const defaults: Settings = { interval: 3, format: 'jpeg', quality: 85, scale: 1, monitor: '', region: null,
  fps: 30, crf: 20, resolution: 1080, output: path.join(app.getPath('videos'), 'FrameLapse'),
  idle: false, idleSeconds: 300, autoExport: true, cleanupPrompt: false };
let settings = { ...defaults };
try { settings = { ...defaults, ...JSON.parse(fs.readFileSync(path.join(data, 'settings.json'), 'utf8')) }; } catch {}
const db = new Sessions(path.join(data, 'sessions')); db.list(true);
let win: BrowserWindow | null = null, picker: BrowserWindow | null = null, tray: Tray;
let quitting = false, busy = false, lastSession: Session | null = null, notice = '';
let exportState = { active: false, progress: 0, text: '', error: '', file: '', id: '' };
type Display = { id: string; name: string; x: number; y: number; width: number; height: number };
let displays: Display[] = [];
async function getDisplays() {
  const text = await runProcess(path.join(assets, 'capture.exe'), ['/list'], undefined, undefined, 15000);
  displays = text.split(/\r?\n/).map(l => l.split(';')).filter(p => p.length >= 6).map(p => ({
    id: p[0], name: p[0].replace('\\\\.\\', ''), x: Number(p[4]), y: Number(p[1]),
    width: Number(p[2]) - Number(p[4]), height: Number(p[3]) - Number(p[1]) }));
  if (!displays.length) throw new Error('No display detected. Unlock Windows and try again.');
  if (!settings.monitor) settings.monitor = displays[0].id;
  return displays;
}
async function capture(s: Settings) {
  if (!displays.some(d => d.id === s.monitor)) throw new Error('Selected display unavailable. Stop and choose a connected monitor.');
  const temp = path.join(data, 'capture.png');
  try {
    await runProcess(path.join(assets, 'capture.exe'), [temp, '/d', s.monitor], undefined, undefined, 15000);
    let pipeline = sharp(await fs.promises.readFile(temp));
    if (s.region) pipeline = pipeline.extract({ left: s.region.x, top: s.region.y, width: s.region.width, height: s.region.height });
    const d = displays.find(d => d.id === s.monitor)!;
    const w = s.region?.width || d.width, h = s.region?.height || d.height;
    if (s.scale !== 1) pipeline = pipeline.resize(Math.max(2, Math.round(w * s.scale)), Math.max(2, Math.round(h * s.scale)), { fit: 'inside' });
    return await (s.format === 'jpeg' ? pipeline.jpeg({ quality: s.quality }) : pipeline.png({ compressionLevel: 3 })).toBuffer();
  } finally { await fs.promises.unlink(temp).catch(() => {}); }
}
const recorder = new Recorder(db, capture, () => powerMonitor.getSystemIdleTime());
function state() { return { state: recorder.state, idlePaused: recorder.idlePaused, error: recorder.error, current: recorder.current,
  last: lastSession, export: exportState, notice, data, settings }; }
function show() { win?.show(); win?.restore(); win?.focus(); }
function updateTray() {
  if (!tray) return;
  tray.setToolTip(`FrameLapse · ${recorder.state}${exportState.active ? ' · Exporting' : ''}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open FrameLapse', click: show },
    { label: 'Start Recording', enabled: recorder.state === 'ready' && !exportState.active, click: () => void guarded(() => start()) },
    { label: recorder.state === 'paused' ? 'Resume Recording' : 'Pause Recording', enabled: recorder.state !== 'ready',
      click: () => void guarded(async () => { if (recorder.state === 'paused') recorder.resume(); else await recorder.pause(); }) },
    { label: 'Stop Recording', enabled: recorder.state !== 'ready', click: () => void guarded(stop) },
    { type: 'separator' }, { label: 'Quit FrameLapse', click: () => void quit() }
  ]));
}
async function guarded(fn: () => Promise<unknown>) {
  try { return { ok: true, value: await fn() }; }
  catch (e) { notice = (e as Error).message; return { ok: false, error: notice }; }
  finally { updateTray(); }
}
async function start(id?: string) {
  if (busy || exportState.active) throw new Error('Please wait for the current operation to finish.');
  busy = true;
  try { await recorder.start(settings, id); notice = ''; lastSession = null; }
  finally { busy = false; }
}
async function stop() {
  if (busy) throw new Error('Please wait for the current operation to finish.');
  busy = true;
  try {
    lastSession = await recorder.stop();
    if (lastSession?.frames && settings.autoExport) void doExport(lastSession.id).catch(e => { notice = e.message; });
    else notice = lastSession?.frames ? 'Session saved. Export it from the Recording Library.' : 'No frames were saved.';
  } finally { busy = false; }
}
async function doExport(id: string) {
  if (exportState.active || recorder.state !== 'ready') throw new Error('Stop recording and wait for the current export first.');
  exportState = { active: true, progress: 0, text: 'Preparing MP4', error: '', file: '', id }; updateTray();
  try {
    const s = db.read(id), exportSettings = { ...settings };
    exportState.file = await exportSession(db, s, exportSettings, ffmpeg, ffprobe, (progress, text) => { exportState.progress = progress; exportState.text = text; });
    lastSession = s;
    new Notification({ title: 'FrameLapse · Video ready', body: 'MP4 export verified. Open FrameLapse to watch your video.' }).show();
    if (exportSettings.cleanupPrompt) {
      show();
      const answer = await dialog.showMessageBox(win!, { type: 'question', buttons: ['Keep screenshots', 'Delete screenshots'], defaultId: 0, cancelId: 0,
        message: 'Your MP4 is ready. Delete this session’s screenshots?', detail: 'This cannot be undone. You will no longer be able to resume or re-export this session. The MP4 will be kept.' });
      if (answer.response === 1) {
        for (const f of frameNames(db.dir(id))) await fs.promises.unlink(path.join(db.dir(id), f));
        s.cleaned = true; s.bytes = 0; db.save(s);
      }
    }
  } catch (e) { exportState.error = (e as Error).message; exportState.text = 'Export failed · screenshots kept'; }
  finally { exportState.active = false; updateTray(); }
}
async function quit() {
  if (exportState.active) { show(); notice = 'Wait for the export to finish before quitting. You can minimize to the tray.'; return; }
  if (recorder.state !== 'ready') {
    show();
    const r = await dialog.showMessageBox(win!, { type: 'question', message: 'Quit while recording?', detail: 'Your frames will be saved. Resume or export this session from the library next time.',
      buttons: ['Keep recording', 'Save session and quit'], defaultId: 0, cancelId: 0 });
    if (r.response !== 1) return;
    await recorder.stop();
  }
  quitting = true; app.quit();
}
function validate(s: Settings) {
  if (![1, 2, 3, 5, 10, 30].includes(s.interval) || ![24, 30, 60].includes(s.fps) ||
    ![720, 1080, 1440, 2160].includes(s.resolution) || ![1, .75, .5, .25].includes(s.scale) ||
    !['jpeg', 'png'].includes(s.format) || !Number.isInteger(s.quality) || s.quality < 30 || s.quality > 100 ||
    ![18, 20, 23, 28].includes(s.crf) || !Number.isFinite(s.idleSeconds) || s.idleSeconds < 30 || s.idleSeconds > 3600)
    throw new Error('Invalid recording settings.');
  if (!path.isAbsolute(s.output) || /^\\\\/.test(s.output)) throw new Error('Choose a local output folder, not a network share.');
  const d = displays.find(d => d.id === s.monitor); if (!d) throw new Error('Choose an available monitor.');
  if (s.region && (![s.region.x, s.region.y, s.region.width, s.region.height].every(Number.isInteger) ||
    s.region.x < 0 || s.region.y < 0 || s.region.width < 2 || s.region.height < 2 ||
    s.region.x + s.region.width > d.width || s.region.y + s.region.height > d.height)) throw new Error('Region must fit within the selected monitor.');
}
function setupIPC() {
  ipcMain.handle('state', () => state()); ipcMain.handle('displays', () => getDisplays()); ipcMain.handle('library', () => db.list());
  ipcMain.handle('action', (_e, action: string, arg?: any) => guarded(async () => {
    if (action === 'start') return start(arg);
    if (action === 'pause') return recorder.pause();
    if (action === 'resume') return recorder.resume();
    if (action === 'stop') return stop();
    if (action === 'export') { void doExport(arg).catch(e => { notice = e.message; }); return; }
    if (action === 'hide') { win?.hide(); return; }
    if (action === 'quit') return quit();
    if (action === 'save-settings') {
      if (recorder.state !== 'ready' || exportState.active) throw new Error('Stop recording/exporting before changing settings.');
      validate(arg); settings = { ...arg }; atomicJSON(path.join(data, 'settings.json'), settings); return settings;
    }
    if (action === 'choose-output') {
      const r = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'], defaultPath: settings.output });
      return r.canceled ? null : r.filePaths[0];
    }
    if (action === 'open-video') {
      const file = db.read(arg).exports.at(-1); if (!file || !fs.existsSync(file)) throw new Error('Exported video not found.');
      const err = await shell.openPath(file); if (err) throw new Error(err); return;
    }
    if (action === 'open-output') { fs.mkdirSync(settings.output, { recursive: true }); return shell.openPath(settings.output); }
    if (action === 'delete') {
      if (recorder.current?.id === arg || exportState.active) throw new Error('This session is in use.');
      const s = db.read(arg);
      const r = await dialog.showMessageBox(win!, { type: 'warning', message: 'Permanently delete this recording session?', detail: `${s.frames} screenshots will be removed. Exported MP4 files will be kept.`, buttons: ['Cancel', 'Delete session'], defaultId: 0, cancelId: 0 });
      if (r.response === 1) await fs.promises.rm(db.dir(s.id), { recursive: true }); return;
    }
    if (action === 'pick-region') {
      if (recorder.state !== 'ready' || picker) throw new Error('Stop recording before selecting a region.');
      const d = displays.find(d => d.id === arg); if (!d) throw new Error('Select a monitor first.');
      const bounds = screen.screenToDipRect(null as any, { x: d.x, y: d.y, width: d.width, height: d.height });
      picker = new BrowserWindow({ ...bounds, title: 'FrameLapse — Select region', frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false, enableLargerThanScreen: true,
        webPreferences: { preload: path.join(__dirname, 'preload-region-picker.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
      picker.setAlwaysOnTop(true, 'screen-saver'); picker.on('closed', () => { picker = null; show(); });
      await picker.loadFile(path.join(__dirname, 'region-picker.html'));
      picker.setBounds(bounds);
      const actual = screen.dipToScreenRect(picker, picker.getBounds());
      await picker.webContents.executeJavaScript(`window.__PICKER_BOUNDS__ = ${JSON.stringify({ x: actual.x - d.x, y: actual.y - d.y, width: actual.width, height: actual.height })};`);
      picker.show(); return;
    }
    throw new Error('Unknown operation.');
  }));
  ipcMain.on('region-pick-done', (e, rect) => { if (e.sender !== picker?.webContents) return; win?.webContents.send('region-picked', rect); picker?.close(); });
  ipcMain.on('region-pick-cancel', () => picker?.close());
}
app.on('second-instance', show); app.on('window-all-closed', () => {});
app.on('before-quit', e => { if (!quitting && !testMode) { e.preventDefault(); void quit(); } });
app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !/^(file|devtools|data):/.test(details.url) }));
  session.defaultSession.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  app.on('web-contents-created', (_e, wc) => { wc.setWindowOpenHandler(() => ({ action: 'deny' })); wc.on('will-navigate', e => e.preventDefault()); wc.on('will-attach-webview', e => e.preventDefault()); });
  sharp.cache({ memory: 16, files: 0, items: 20 }); sharp.concurrency(1);
  try { await getDisplays(); } catch (e) { notice = (e as Error).message; }
  if (testMode) {
    session.defaultSession.enableNetworkEmulation({ offline: true });
    const { selfTest } = require('./self-test');
    try { await selfTest({ db, capture, settings, ffmpeg, ffprobe, data, displays }); app.exit(0); }
    catch (e) { fs.writeFileSync(path.join(data, 'FAILED.txt'), String((e as Error).stack)); app.exit(1); }
    return;
  }
  setupIPC(); Menu.setApplicationMenu(null);
  win = new BrowserWindow({ width: 1060, height: 790, minWidth: 860, minHeight: 680, title: 'FrameLapse', backgroundColor: '#f1d5aa', icon, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false } });
  win.on('close', e => { if (!quitting) { e.preventDefault(); win?.hide(); } }); win.on('minimize', () => win?.hide());
  tray = new Tray(nativeImage.createFromPath(icon).resize({ width: 20, height: 20 })); tray.on('double-click', show); updateTray();
  powerMonitor.on('suspend', () => { if (recorder.state === 'recording') void recorder.pause().then(() => { notice = 'Paused when Windows went to sleep. Resume when ready.'; updateTray(); }); });
  screen.on('display-removed', () => { void recorder.pause(); void getDisplays().catch(() => {}); notice = 'Display configuration changed. Review your capture settings.'; });
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}).catch(e => { dialog.showErrorBox('FrameLapse could not start', String(e)); app.exit(1); });
