import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';
import sharp from 'sharp';
import { Sessions, Recorder, Settings, exportSession, requireSpace, frameNames, runProcess } from './core';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function until(fn: () => boolean, max = 15000) {
  const end = Date.now() + max;
  while (!fn()) { if (Date.now() > end) throw new Error('Timed out waiting for recording'); await sleep(30); }
}
export async function selfTest(ctx: any) {
  const { db, capture, ffmpeg, ffprobe, data, displays } = ctx;
  const settings: Settings = { ...ctx.settings, interval: 1, autoExport: false, output: path.join(data, 'videos') };
  const results: any[] = [];
  const check = async (name: string, fn: () => Promise<any>) => {
    const start = Date.now();
    try { const detail = await fn(); results.push({ name, pass: true, ms: Date.now() - start, detail }); }
    catch (e) { results.push({ name, pass: false, error: String(e) }); throw e; }
    finally { fs.writeFileSync(path.join(data, 'test-results.json'), JSON.stringify({ packaged: true, results }, null, 2)); }
  };
  let realSession: any;
  await check('Real monitor screenshot and selected region / JPEG / PNG / resize', async () => {
    assert(displays.length > 0);
    for (const d of displays) {
      const full = await capture({ ...settings, monitor: d.id });
      const m = await sharp(full).metadata(); assert.equal(m.width, d.width); assert.equal(m.height, d.height); assert.equal(m.format, 'jpeg');
      const region = await capture({ ...settings, monitor: d.id, format: 'png', scale: .5, region: { x: 20, y: 20, width: 400, height: 240 } });
      const rm = await sharp(region).metadata(); assert.equal(rm.width, 200); assert.equal(rm.height, 120); assert.equal(rm.format, 'png');
    }
    return { monitorsTested: displays.length };
  });
  await check('Real recording / duplicate guard / pause / resume / stop', async () => {
    const r = new Recorder(db, capture, () => 0); await r.start(settings);
    await assert.rejects(() => r.start(settings), /already active/);
    await until(() => (r.current?.frames || 0) >= 2);
    await r.pause(); const count = r.current!.frames; await sleep(1200); assert.equal(r.current!.frames, count);
    r.resume(); await until(() => r.current!.frames > count); realSession = await r.stop();
    const stopCount = realSession.frames; await sleep(1100); assert.equal(db.read(realSession.id).frames, stopCount);
    assert.equal(r.state, 'ready'); return { frames: stopCount };
  });
  const image = await sharp({ create: { width: 320, height: 180, channels: 3, background: '#af3c40' } }).jpeg().toBuffer();
  await check('Stop waits for in-flight capture; session boundaries remain separate', async () => {
    let release: (() => void) | undefined;
    const r = new Recorder(db, () => new Promise<Buffer>(res => { release = () => res(image); }), () => 0);
    await r.start(settings); await until(() => !!release);
    const ending = r.stop(); assert.equal(r.state, 'stopping'); release!(); const first = await ending;
    const r2 = new Recorder(db, async () => image, () => 0); await r2.start(settings); await until(() => !!r2.current?.frames); const second = await r2.stop();
    assert.notEqual(first!.id, second!.id); assert.equal(frameNames(db.dir(first!.id)).length, 1); assert.equal(second!.frames, 1);
  });
  await check('Idle suppression and automatic return on activity', async () => {
    let idle = 1000;
    const r = new Recorder(db, async () => image, () => idle); await r.start({ ...settings, idle: true, idleSeconds: 30 });
    await until(() => r.idlePaused); assert.equal(r.current!.frames, 0); idle = 0;
    await until(() => r.current!.frames > 0); assert(!r.idlePaused); await r.stop();
  });
  await check('Intervals 1, 2, 3, 5, 10, 30 seconds; no continuous capture', async () => {
    const actual: any[] = [];
    for (const interval of [1, 2, 3, 5, 10, 30]) {
      const stamps: number[] = [];
      const r = new Recorder(db, async () => { stamps.push(Date.now()); return image; }, () => 0);
      await r.start({ ...settings, interval }); await until(() => stamps.length >= 2, (interval + 4) * 1000); await r.stop();
      const delta = stamps[1] - stamps[0]; assert(delta >= interval * 1000 - 30 && delta < interval * 1000 + 3000, `Interval ${interval}s measured ${delta}ms`); actual.push({ interval, measuredMs: delta });
    }
    return actual;
  });
  await check('Recovery after interrupted frame/metadata commit and ordered resume', async () => {
    const s = db.create(settings), dir = db.dir(s.id);
    fs.writeFileSync(path.join(dir, 'frame_000000001.jpg'), image);
    fs.writeFileSync(path.join(dir, 'frame_000000003.jpg'), image);
    fs.writeFileSync(path.join(dir, 'frame_000000004.jpg.part'), 'interrupted');
    const recovered = db.read(s.id, true); assert.equal(recovered.status, 'recovered'); assert.equal(recovered.frames, 2); assert.equal(recovered.nextIndex, 4);
    const r = new Recorder(db, async () => image, () => 0); await r.start(settings, s.id); await until(() => r.current!.frames === 3); await r.stop();
    assert.deepEqual(frameNames(dir), ['frame_000000001.jpg', 'frame_000000003.jpg', 'frame_000000004.jpg']);
  });
  await check('Insufficient storage blocks start and pauses active recording without deleting frames', async () => {
    assert.throws(() => requireSpace(data, 100, (() => ({ bavail: 0, bsize: 4096 })) as any), /Low disk/);
    const r = new Recorder(db, async () => image, () => 0, () => { throw new Error('Low disk space'); });
    await assert.rejects(() => r.start(settings), /Low disk/);
    let calls = 0;
    const r2 = new Recorder(db, async () => image, () => 0, () => { if (++calls > 2) throw new Error('Low disk space'); });
    await r2.start(settings); await until(() => r2.state === 'paused'); assert.equal(r2.current!.frames, 1); await r2.stop();
  });
  await check('Temporary capture failure retries; repeated failures pause visibly', async () => {
    let n = 0;
    const r = new Recorder(db, async () => { if (++n === 1) throw new Error('temporary'); return image; }, () => 0);
    await r.start(settings); await until(() => !!r.current?.frames); assert.equal(r.error, ''); await r.stop();
    const r2 = new Recorder(db, async () => { throw new Error('capture unavailable'); }, () => 0);
    await r2.start(settings); await until(() => r2.state === 'paused'); assert.match(r2.error, /unavailable/); await r2.stop();
  });
  await check('MP4 24/30/60 FPS, exact frame count/duration, H.264 full decode', async () => {
    const files = [];
    for (const fps of [24, 30, 60]) files.push(await exportSession(db, db.read(realSession.id), { ...settings, fps }, ffmpeg, ffprobe, () => {}));
    return { files };
  });
  await check('1000-frame export; expected chronological color order', async () => {
    const s = db.create(settings), dir = db.dir(s.id);
    const red = image, green = await sharp({ create: { width: 320, height: 180, channels: 3, background: '#24c744' } }).jpeg().toBuffer();
    for (let i = 1; i <= 1000; i++) fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(9, '0')}.jpg`), i <= 500 ? red : green);
    const recovered = db.read(s.id, true);
    const file = await exportSession(db, recovered, { ...settings, resolution: 720 }, ffmpeg, ffprobe, () => {});
    for (const [stamp, color] of [['0', 'red'], ['20', 'green']]) {
      const png = path.join(data, `order-${color}.png`);
      await runProcess(ffmpeg, ['-v', 'error', '-y', '-ss', stamp, '-i', file, '-frames:v', '1', png]);
      const stat = await sharp(png).stats();
      assert(color === 'red' ? stat.channels[0].mean > stat.channels[1].mean * 1.5 : stat.channels[1].mean > stat.channels[0].mean * 1.5);
    }
    return { frames: 1000, fps: 30, resolution: '1280x720', file };
  });
  await check('Missing FFmpeg / invalid encoder / failed verification preserve all screenshots', async () => {
    const before = frameNames(db.dir(realSession.id)).length;
    await assert.rejects(() => exportSession(db, db.read(realSession.id), settings, path.join(data, 'missing.exe'), ffprobe, () => {}));
    await assert.rejects(() => exportSession(db, db.read(realSession.id), settings, ffprobe, ffprobe, () => {}));
    await assert.rejects(() => exportSession(db, db.read(realSession.id), settings, ffmpeg, path.join(data, 'missing-probe.exe'), () => {}));
    assert.equal(frameNames(db.dir(realSession.id)).length, before); assert.equal(db.read(realSession.id).status, 'export-failed');
  });
  await check('Network requests blocked in Electron session', async () => {
    const { BrowserWindow } = require('electron');
    const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
    try { await assert.rejects(() => w.loadURL('https://example.invalid/')); } finally { w.destroy(); }
  });
  fs.writeFileSync(path.join(data, 'PASSED.txt'), `${results.length} test groups passed`);
}
