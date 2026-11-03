const { spawn } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', 'FrameLapse-build', 'win-unpacked');
const data = path.join(process.env.LOCALAPPDATA, 'FrameLapse-test-' + Date.now());
const p = spawn(path.join(root, 'FrameLapse.exe'), ['--self-test'], { windowsHide: true, env: { ...process.env, FRAMELAPSE_TEST_DATA: data } });
console.log('Test results: ' + data);
p.on('error', e => { console.error(e); process.exitCode = 1; });
p.on('exit', code => { console.log('Test exit code: ' + code); process.exitCode = code || 0; });
