// FrameLapse: GPL-3.0-only. Based on TimeLapser's local capture/session architecture.
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import os from 'os';

export type Settings = {
  interval: number; format: 'jpeg' | 'png'; quality: number; scale: number;
  monitor: string; region: null | { x: number; y: number; width: number; height: number };
  fps: number; crf: number; resolution: number; output: string;
  idle: boolean; idleSeconds: number; autoExport: boolean; cleanupPrompt: boolean;
};
export type Session = {
  id: string; created: string; updated: string; status: string; frames: number;
  nextIndex: number; bytes: number; elapsed: number; settings: Settings;
  exports: string[]; error?: string; cleaned?: boolean;
};
export function atomicJSON(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tmp';
  const fd = fs.openSync(temp, 'w');
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2)); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(temp, file);
}
export function frameNames(dir: string) {
  return fs.readdirSync(dir).filter(n => /^frame_\d{9}\.(jpg|png)$/.test(n)).sort();
}
export class Sessions {
  constructor(public root: string) { fs.mkdirSync(root, { recursive: true }); }
  dir(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid session ID');
    return path.join(this.root, id);
  }
  save(s: Session) { s.updated = new Date().toISOString(); atomicJSON(path.join(this.dir(s.id), 'session.json'), s); }
  create(settings: Settings) {
    const s: Session = { id: randomUUID(), created: new Date().toISOString(), updated: '', status: 'recording',
      frames: 0, nextIndex: 1, bytes: 0, elapsed: 0, settings: { ...settings }, exports: [] };
    this.save(s); return s;
  }
  read(id: string, recover = false): Session {
    const dir = this.dir(id);
    let s: Session;
    try { s = JSON.parse(fs.readFileSync(path.join(dir, 'session.json'), 'utf8')); }
    catch (e) {
      // A completed but uncommitted first metadata write can survive a power loss.
      s = JSON.parse(fs.readFileSync(path.join(dir, 'session.json.tmp'), 'utf8'));
    }
    if (s.id !== id) throw new Error('Session identity mismatch');
    if (recover) {
      const names = frameNames(dir);
      if (!s.cleaned) s.frames = names.length;
      s.nextIndex = names.length ? Number(names.at(-1)!.slice(6, 15)) + 1 : 1;
      s.bytes = names.reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
      if (['recording', 'paused', 'exporting'].includes(s.status)) s.status = 'recovered';
      this.save(s);
    }
    return s;
  }
  list(recover = false) {
    const result: Session[] = [];
    for (const id of fs.readdirSync(this.root)) {
      if (!/^[a-f0-9-]{36}$/.test(id)) continue;
      try { result.push(this.read(id, recover)); } catch { /* Leave unreadable folders untouched. */ }
    }
    return result.sort((a, b) => b.created.localeCompare(a.created));
  }
}
export function requireSpace(dir: string, minimum = 128 * 1024 * 1024, stat = fs.statfsSync) {
  const s = stat(dir);
  if (Number(s.bavail) * Number(s.bsize) < minimum) throw new Error('Low disk space. Recording paused; existing frames are safe. Free space and resume.');
}
export class Recorder {
  current: Session | null = null;
  state = 'ready';
  idlePaused = false;
  error = '';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flight: Promise<void> | null = null;
  private lastTick = 0;
  private failures = 0;
  constructor(public sessions: Sessions, private capture: (s: Settings) => Promise<Buffer>,
    private idleTime: () => number, private freeSpace = requireSpace) {}
  async start(settings: Settings, id?: string) {
    if (this.state !== 'ready') throw new Error('A recording is already active.');
    this.freeSpace(this.sessions.root);
    const s = id ? this.sessions.read(id, true) : this.sessions.create(settings);
    if (s.cleaned) throw new Error('The frames for this session were cleaned up. Start a new recording.');
    this.current = s; this.state = 'recording'; this.error = ''; this.failures = 0;
    s.status = 'recording'; this.sessions.save(s); this.lastTick = Date.now();
    this.schedule(0);
    return s;
  }
  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flight = this.tick().finally(() => { this.flight = null; });
    }, ms);
  }
  private async tick() {
    const s = this.current;
    if (!s || this.state !== 'recording') return;
    const begin = Date.now();
    let captureStarted = begin;
    const wasIdle = this.idlePaused;
    this.idlePaused = s.settings.idle && this.idleTime() >= s.settings.idleSeconds;
    if (!wasIdle && !this.idlePaused) s.elapsed += Math.max(0, begin - this.lastTick);
    this.lastTick = begin;
    if (!this.idlePaused) {
      try {
        this.freeSpace(this.sessions.dir(s.id));
        captureStarted = Date.now();
        const buffer = await this.capture(s.settings);
        if (!buffer.length) throw new Error('Screen capture returned an empty image.');
        const ext = s.settings.format === 'jpeg' ? 'jpg' : 'png';
        const file = path.join(this.sessions.dir(s.id), `frame_${String(s.nextIndex).padStart(9, '0')}.${ext}`);
        // Never expose half-written frames to recovery or export.
        const pending = file + '.' + randomUUID() + '.part';
        await fs.promises.writeFile(pending, buffer, { flag: 'wx' });
        if (fs.existsSync(file)) throw new Error('Frame collision: recording paused to protect your images.');
        await fs.promises.rename(pending, file);
        s.frames++; s.nextIndex++; s.bytes += buffer.length; s.error = ''; this.error = ''; this.failures = 0;
        this.sessions.save(s);
      } catch (e) {
        this.error = String((e as Error).message); s.error = this.error;
        if (++this.failures >= 3 || /space|ENOSPC|collision/i.test(this.error)) {
          this.state = 'paused'; s.status = 'paused';
        }
        try { this.sessions.save(s); } catch { /* Preserve frames even when metadata disk is full. */ }
      }
    }
    if (this.state === 'recording') this.schedule(Math.max(100, s.settings.interval * 1000 - (Date.now() - captureStarted)));
  }
  async pause() {
    if (this.state !== 'recording') return;
    this.state = 'paused';
    if (this.timer) clearTimeout(this.timer);
    await this.flight;
    if (this.current) { this.current.status = 'paused'; this.sessions.save(this.current); }
  }
  resume() {
    if (this.state !== 'paused' || !this.current) return;
    this.freeSpace(this.sessions.dir(this.current.id));
    this.failures = 0; this.error = ''; this.idlePaused = false;
    this.state = 'recording'; this.current.status = 'recording'; this.lastTick = Date.now();
    this.sessions.save(this.current); this.schedule(0);
  }
  async stop() {
    if (!this.current) return null;
    this.state = 'stopping';
    if (this.timer) clearTimeout(this.timer);
    await this.flight;
    const s = this.current;
    s.status = 'stopped'; this.sessions.save(s);
    this.current = null; this.state = 'ready'; this.idlePaused = false;
    return s;
  }
}
export function runProcess(exe: string, args: string[], onLine?: (line: string) => void, cwd?: string, timeout = 0) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    if (/ff(mpeg|probe)\.exe$/i.test(exe)) {
      try { if (child.pid) os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
    }
    const watchdog = timeout ? setTimeout(() => { child.kill(); reject(new Error('Screen capture timed out. Unlock Windows and resume recording.')); }, timeout) : null;
    let result = '', errors = '', pending = '';
    child.stdout.on('data', b => {
      const t = String(b); result = (result + t).slice(-200000); pending += t;
      const lines = pending.split(/\r?\n/); pending = lines.pop()!;
      lines.forEach(l => onLine?.(l));
    });
    child.stderr.on('data', b => { errors = (errors + String(b)).slice(-12000); });
    child.on('error', e => { if (watchdog) clearTimeout(watchdog); reject(e); });
    child.on('close', code => { if (watchdog) clearTimeout(watchdog); code === 0 ? resolve(result) : reject(new Error(`Process exited (${code}): ${errors.slice(-2500)}`)); });
  });
}
export async function exportSession(db: Sessions, s: Session, settings: Settings, ffmpeg: string, ffprobe: string,
  progress: (n: number, text: string) => void) {
  const dir = db.dir(s.id), frames = frameNames(dir);
  if (!frames.length) throw new Error('This session has no saved frames to export.');
  fs.mkdirSync(settings.output, { recursive: true });
  requireSpace(settings.output);
  const name = `FrameLapse_${new Date().toISOString().replace(/[:.]/g, '-')}_${randomUUID().slice(0, 8)}`;
  const output = path.join(settings.output, name + '.mp4');
  const temp = path.join(settings.output, name + '.partial.mp4');
  const list = path.join(dir, 'export.ffconcat');
  // Paths in the manifest are generated relative basenames; no quoting of user paths is needed.
  fs.writeFileSync(list, 'ffconcat version 1.0\n' + frames.map(f => `file '${f}'\noption framerate ${settings.fps}\n`).join(''));
  s.status = 'exporting'; db.save(s);
  const h = settings.resolution, w = Math.round(h * 16 / 9 / 2) * 2;
  try {
    progress(0, 'Encoding MP4');
    await runProcess(ffmpeg, ['-hide_banner', '-nostdin', '-n', '-v', 'error', '-protocol_whitelist', 'file,pipe',
      '-f', 'concat', '-safe', '0', '-i', list, '-an', '-vf',
      `setpts=N/(${settings.fps}*TB),scale=${w}:${h}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
      '-r', String(settings.fps), '-frames:v', String(frames.length), '-c:v', 'libx264', '-preset', 'veryfast',
      '-crf', String(settings.crf), '-threads', '2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      '-progress', 'pipe:1', temp], line => {
        if (line.startsWith('frame=')) progress(Math.min(94, Number(line.slice(6)) / frames.length * 94), 'Encoding MP4');
      });
    progress(95, 'Verifying video');
    const info = JSON.parse(await runProcess(ffprobe, ['-v', 'error', '-threads', '2', '-select_streams', 'v:0', '-count_frames',
      '-show_entries', 'stream=codec_name,width,height,nb_read_frames,avg_frame_rate:format=duration', '-of', 'json', temp]));
    const v = info.streams?.[0], duration = Number(info.format?.duration);
    if (!v || v.codec_name !== 'h264' || Number(v.nb_read_frames) !== frames.length || v.width !== w || v.height !== h ||
      Math.abs(duration - frames.length / settings.fps) > Math.max(0.1, 2 / settings.fps)) throw new Error('Video validation failed. Your screenshots have been kept.');
    // Decode the whole video: metadata alone does not establish playability.
    await runProcess(ffmpeg, ['-v', 'error', '-xerror', '-nostdin', '-threads', '2', '-i', temp, '-f', 'null', '-']);
    await fs.promises.rename(temp, output);
    s.exports.push(output); s.status = 'exported'; s.error = ''; db.save(s);
    progress(100, 'Video ready'); return output;
  } catch (e) {
    s.status = 'export-failed'; s.error = (e as Error).message;
    try { db.save(s); } catch { /* Existing frames remain recoverable. */ }
    throw e;
  }
}
