import { useEffect, useState } from 'react';
import type { Settings, Session } from '../electron/core';

declare global { interface Window { framelapse: any } }

const api = window.framelapse;
const time = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
};
const size = (bytes: number) => bytes > 1073741824 ? `${(bytes / 1073741824).toFixed(2)} GB` : `${(bytes / 1048576).toFixed(1)} MB`;

type Tab = 'record' | 'library' | 'settings';
type ArtIconName = 'monitor' | 'library' | 'settings' | 'stopwatch' | 'storage' | 'power';

function ArtIcon({ name }: { name: ArtIconName }) {
  if (name === 'monitor') return <svg className="art-icon" viewBox="0 0 64 64" aria-hidden="true"><rect x="7" y="10" width="50" height="35" rx="4" /><path d="M25 53h14M32 45v8M15 18h34v19H15z" /><path className="accent" d="M18 23h8m-8 0v8m28-8h-8m8 0v8" /></svg>;
  if (name === 'library') return <svg className="art-icon" viewBox="0 0 64 64" aria-hidden="true"><rect x="15" y="10" width="39" height="35" rx="3" /><path d="M10 19v34h40" /><circle className="accent" cx="42" cy="21" r="4" /><path d="m19 39 9-10 7 7 6-6 9 9" /></svg>;
  if (name === 'settings') return <svg className="art-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="m27 7 2-4h6l2 4 6 3 5-1 4 5-3 5 2 7 5 3v6l-5 3-2 7 3 5-4 5-5-1-6 3-2 5h-6l-2-5-7-3-5 1-4-5 3-5-2-7-5-3v-6l5-3 2-7-3-5 4-5 5 1z" /><circle className="accent-fill" cx="32" cy="32" r="9" /></svg>;
  if (name === 'stopwatch') return <svg className="art-icon" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="36" r="21" /><path d="M25 7h14M32 8v7M48 17l5 5M32 36l9-9M32 20v4M18 36h-4M46 36h4M32 48v4" /><circle className="accent-fill" cx="32" cy="36" r="3" /></svg>;
  if (name === 'storage') return <svg className="art-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M10 21h44v32H10zM7 21l5-10h40l5 10M24 31h16" /><path className="accent" d="M32 36v10m-5-5 5 5 5-5" /></svg>;
  return <svg className="art-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6v24M20 14a23 23 0 1 0 24 0" /></svg>;
}

function StatusSign({ state, exporting }: { state: string; exporting: boolean }) {
  const label = exporting ? 'EXPORTING' : state === 'recording' ? 'RECORDING' : state === 'paused' ? 'PAUSED' : state === 'stopping' ? 'SAVING' : 'READY';
  return <div className={`status-sign ${state === 'recording' ? 'is-recording' : ''}`} role="status" aria-live="polite"><i />{label}</div>;
}

function KonohaRoof({ state, exporting }: { state: string; exporting: boolean }) {
  return <header className="shop-roof" aria-label="FrameLapse">
    <img className="roof-tiles" src="./konoha/roof_green.png" alt="" aria-hidden="true" />
    <div className="roof-eaves" aria-hidden="true" />
    <div className="noren-title" aria-hidden="true">
      <span className="noren-symbol">◎</span><span>ラ</span><span>ー</span><span>メ</span><span>ン</span><span>楽</span><span className="noren-symbol">◎</span>
    </div>
    <StatusSign state={state} exporting={exporting} />
  </header>;
}

function WoodNavButton({ active, icon, children, onClick }: { active: boolean; icon: ArtIconName; children: React.ReactNode; onClick: () => void }) {
  return <button className={`wood-nav ${active ? 'selected' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
    <ArtIcon name={icon} /><span>{children}</span>
  </button>;
}

function WoodSidebar({ tab, openTab, action }: { tab: Tab; openTab: (tab: Tab) => void; action: (name: string, arg?: any) => Promise<any> }) {
  return <aside className="wood-sidebar">
    <div className="brand-sign"><span className="brand-swirl">◎</span><strong>FrameLapse</strong></div>
    <nav aria-label="Primary navigation">
      <WoodNavButton active={tab === 'record'} icon="monitor" onClick={() => openTab('record')}>FrameLapse</WoodNavButton>
      <WoodNavButton active={tab === 'library'} icon="library" onClick={() => openTab('library')}>Library</WoodNavButton>
      <WoodNavButton active={tab === 'settings'} icon="settings" onClick={() => openTab('settings')}>Settings</WoodNavButton>
    </nav>
    <img className="hanging-lantern" src="./konoha/red_lantern.png" alt="" aria-hidden="true" />
    <div className="stall-scene" aria-hidden="true"><img src="./konoha/ramen_stall_reference.png" alt="" /></div>
    <div className="sidebar-actions">
      <button onClick={() => action('hide')}><span aria-hidden="true">−</span> Minimize</button>
      <button onClick={() => action('quit')}><ArtIcon name="power" /> Quit</button>
      <small>v1.0.0</small>
    </div>
  </aside>;
}

function NorenStatBanner({ icon, label, value, suffix }: { icon: ArtIconName; label: string; value: string; suffix?: string }) {
  return <section className="noren-stat">
    <img className="noren-stat-bg" src="./konoha/noren_stats_banner.png" alt="" aria-hidden="true" />
    <div className="noren-stat-content">
      <ArtIcon name={icon} />
      <div><span>{label}</span><strong>{value}{suffix && <em>{suffix}</em>}</strong></div>
    </div>
  </section>;
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="page-title"><span>{eyebrow}</span><h1>{title}</h1></div>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('record');
  const [state, setState] = useState<any>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [displays, setDisplays] = useState<any[]>([]);
  const [library, setLibrary] = useState<Session[]>([]);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  async function refresh() { const next = await api.state(); setState(next); return next; }
  useEffect(() => {
    refresh().then(next => setDraft(next.settings)).catch(error => setMessage(String(error)));
    api.displays().then(setDisplays).catch((error: Error) => setMessage(error.message));
    const timer = setInterval(() => { refresh().catch(() => {}); }, 1000);
    const off = api.onRegion((region: any) => setDraft(current => current ? { ...current, region } : current));
    return () => { clearInterval(timer); off(); };
  }, []);
  useEffect(() => { if (tab === 'library') api.library().then(setLibrary); }, [tab, state?.export.active, state?.state]);
  useEffect(() => {
    const pane = document.querySelector<HTMLElement>('.shop-main');
    if (pane) pane.scrollTop = 0;
  }, [tab]);

  async function action(name: string, arg?: any) {
    setWorking(true); setMessage('');
    try {
      const result = await api.action(name, arg);
      if (!result.ok) throw new Error(result.error);
      await refresh();
      if (tab === 'library') setLibrary(await api.library());
      return result.value;
    } catch (error) { setMessage((error as Error).message); }
    finally { setWorking(false); }
  }

  function openTab(nextTab: Tab) {
    if (nextTab === 'settings') setDraft(state.settings);
    setTab(nextTab); setMessage('');
  }

  if (!state || !draft) return <div className="loading">Opening FrameLapse…</div>;

  const recordingSession = state.current || state.last;
  const active = state.state !== 'ready';
  const locked = active || state.export.active || working;
  const status = state.idlePaused ? 'Paused while idle' : state.state === 'ready' ? 'Ready when you are' : state.state === 'recording' ? 'Recording your workflow' : state.state === 'paused' ? 'Recording paused' : 'Saving session';
  const sessionSettings = recordingSession?.settings || state.settings;
  const selected = displays.find(display => display.id === sessionSettings.monitor);
  const edit = (key: keyof Settings, value: any) => setDraft({ ...draft, [key]: value });
  const select = (label: string, key: keyof Settings, options: [any, string][]) => <label>{label}<select value={String(draft[key])} onChange={event => edit(key, typeof options[0][0] === 'number' ? Number(event.target.value) : event.target.value)}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;

  const background = tab === 'record' ? './konoha/framelapse-bg-record.png' : tab === 'library' ? './konoha/framelapse-bg-library.png' : './konoha/framelapse-bg-settings.png';
  return <div className={`shop-shell image-shell page-${tab}`}>
    <img className="shop-background" src={background} alt="" aria-hidden="true" />
    <KonohaRoof state={state.state} exporting={state.export.active} />
    <div className="shop-body">
      <WoodSidebar tab={tab} openTab={openTab} action={action} />
      <main className="shop-main">
        {(message || state.error || state.notice) && <div className="notice" role="status">{message || state.error || state.notice}</div>}

        {tab === 'record' && <>
          <section className="recording-dashboard">
            <div className="dashboard-copy">
              <div className="record-status"><span className={`record-dot ${state.state === 'recording' ? 'on' : ''}`} />{status}</div>
              <div className="timer-label">SESSION TIME</div>
              <div className="session-timer">{time(recordingSession?.elapsed || 0)}</div>
              <div className="capture-card">
                <ArtIcon name="monitor" />
                <div className="source-copy"><b>{selected?.name || 'Select a display'}</b><p>{sessionSettings.region ? 'Selected region' : 'Entire screen'} · every {sessionSettings.interval} seconds · {sessionSettings.format.toUpperCase()}</p></div>
                <button className="change-link" disabled={locked} onClick={() => openTab('settings')}>Change</button>
              </div>
              <div className="recording-controls">
                <button className="start-button" disabled={locked} onClick={() => action('start')}><span aria-hidden="true">▶</span> Start Recording</button>
                <button disabled={!active || working || state.state === 'stopping'} onClick={() => action(state.state === 'paused' ? 'resume' : 'pause')}>{state.state === 'paused' ? '▶ Resume' : 'Ⅱ Pause'}</button>
                <button disabled={!active || working || state.state === 'stopping'} onClick={() => action('stop')}>■ Stop</button>
              </div>
            </div>
            <div className="character-scene" aria-hidden="true"><img src="./konoha/character_scene_reference.png" alt="" /></div>
          </section>
          <div className="wood-support" aria-hidden="true" />
          <div className="stats-bar">
            <NorenStatBanner icon="library" label="SCREENSHOTS" value={(recordingSession?.frames || 0).toLocaleString()} />
            <NorenStatBanner icon="stopwatch" label="VIDEO LENGTH" value={((recordingSession?.frames || 0) / state.settings.fps).toFixed(1)} suffix=" sec" />
            <NorenStatBanner icon="storage" label="STORAGE" value={size(recordingSession?.bytes || 0)} />
          </div>
        </>}

        {state.export.text && <section className={`export-card ${state.export.error ? 'failed' : ''}`}><div className="row"><b>{state.export.text}</b><span>{Math.round(state.export.progress)}%</span></div><progress max="100" value={state.export.progress} /><p>{state.export.error || (state.export.active ? 'Encoding locally with bundled FFmpeg. Your screenshots remain safe.' : state.export.file)}</p>{state.export.file && !state.export.active && <div className="row buttons"><button onClick={() => action('open-video', state.export.id)}>▶ Open Video</button><button onClick={() => action('open-output')}>Open Folder</button></div>}</section>}

        {tab === 'library' && <div className="parchment-page">
          <PageTitle eyebrow="RECORDING LIBRARY" title="Your captured moments" />
          <div className="page-toolbar"><span>{library.length} {library.length === 1 ? 'session' : 'sessions'} stored on this PC</span><button onClick={() => action('open-output')}>Open video folder</button></div>
          <div className="sessions">{library.length === 0 ? <section className="empty"><img src="./icon-kunai.png" alt="" /><div><h2>Your story starts with a frame.</h2><p>Start recording and your sessions will appear here.</p><button className="start-button compact" onClick={() => openTab('record')}>▶ Go to Recorder</button></div></section> : library.map((item, index) => <section className="session" key={item.id}><div className="session-index">{String(index + 1).padStart(2, '0')}</div><div className="session-body"><div className="row"><b>{new Date(item.created).toLocaleString()}</b><span className="pill">{item.cleaned ? 'screenshots cleaned' : item.status}</span></div><p>{item.frames.toLocaleString()} frames <i /> {time(item.elapsed)} recorded <i /> {size(item.bytes)}</p>{item.error && <p className="error">{item.error}</p>}<div className="row buttons"><button className="start-button compact" disabled={locked || item.cleaned || !item.frames} onClick={() => action('export', item.id)}>Export MP4</button><button disabled={locked || item.cleaned} onClick={() => action('start', item.id).then(() => setTab('record'))}>Resume session</button><button disabled={!item.exports.length} onClick={() => action('open-video', item.id)}>Open Video</button><button className="danger" disabled={locked} onClick={() => action('delete', item.id)}>Delete</button></div></div></section>)}</div>
        </div>}

        {tab === 'settings' && <div className="parchment-page settings-page">
          <PageTitle eyebrow="RECORDING SETTINGS" title="Tune your flow" />
          <fieldset disabled={locked}>
            <section className="settings-section"><div className="section-heading"><span>01</span><h2>Screen capture</h2></div><div className="form-grid"><label>Monitor<select value={draft.monitor} onChange={event => setDraft({ ...draft, monitor: event.target.value, region: null })}>{displays.map(display => <option value={display.id} key={display.id}>{display.name} · {display.width} × {display.height}</option>)}</select></label>{select('Screenshot interval', 'interval', [1, 2, 3, 5, 10, 30].map(value => [value, `Every ${value} seconds`]))}{select('Image format', 'format', [['jpeg', 'JPEG · smaller files'], ['png', 'PNG · lossless']])}{select('Capture resolution', 'scale', [[1, '100% · native resolution'], [.75, '75%'], [.5, '50%'], [.25, '25%']])}<label>JPEG quality · {draft.quality}%<input type="range" min="30" max="100" value={draft.quality} onChange={event => edit('quality', Number(event.target.value))} /></label><label>Capture area<div className="row buttons"><button onClick={() => action('pick-region', draft.monitor)}>Select region…</button><button onClick={() => edit('region', null)}>Full screen</button></div><small>{draft.region ? `${draft.region.width} × ${draft.region.height} at ${draft.region.x}, ${draft.region.y}` : 'Entire selected monitor'}</small></label></div></section>
            <section className="settings-section"><div className="section-heading"><span>02</span><h2>MP4 video</h2></div><div className="form-grid">{select('Output frame rate', 'fps', [24, 30, 60].map(value => [value, `${value} FPS`]))}{select('Video resolution · 16:9', 'resolution', [720, 1080, 1440, 2160].map(value => [value, `${value}p`]))}{select('Video quality', 'crf', [[18, 'Very high · larger file'], [20, 'High · recommended'], [23, 'Balanced'], [28, 'Compact']])}<label>Output folder<div className="folder">{draft.output}</div><button onClick={async () => { const folder = await action('choose-output'); if (folder) edit('output', folder); }}>Choose folder…</button></label></div></section>
            <section className="settings-section"><div className="section-heading"><span>03</span><h2>Recording behavior</h2></div><label className="check"><input type="checkbox" checked={draft.autoExport} onChange={event => edit('autoExport', event.target.checked)} /><div>Export automatically after Stop</div></label><label className="check"><input type="checkbox" checked={draft.idle} onChange={event => edit('idle', event.target.checked)} /><div>Pause while inactive</div></label><label className="idle">Idle threshold (seconds)<input type="number" min="30" max="3600" value={draft.idleSeconds} onChange={event => edit('idleSeconds', Number(event.target.value))} /></label><label className="check"><input type="checkbox" checked={draft.cleanupPrompt} onChange={event => edit('cleanupPrompt', event.target.checked)} /><div>Offer screenshot cleanup</div></label></section>
            <div className="save-bar"><span>Settings are stored locally.</span><button className="start-button compact" onClick={async () => { const saved = await action('save-settings', draft); if (saved) setMessage('Settings saved.'); }}>Save settings</button></div>
          </fieldset>{locked && <p className="notice">Stop recording and wait for export to finish to edit settings.</p>}
        </div>}
      </main>
    </div>
  </div>;
}
