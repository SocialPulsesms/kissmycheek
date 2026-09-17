/**
 * Prefer Git Bash on Windows. `npm run deploy` → bash is WSL, which has no distro here.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const script = process.argv[2] || 'deploy.sh';
const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';

const bash =
  process.platform === 'win32' && fs.existsSync(gitBash) ? gitBash : 'bash';

const child = spawn(bash, [script], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
});

child.on('exit', (code) => process.exit(code == null ? 1 : code));
