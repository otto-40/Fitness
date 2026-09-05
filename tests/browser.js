/* Resolves a Chromium binary for the test run.
   Order: CHROME_PATH, then the pre-installed browsers under
   PLAYWRIGHT_BROWSERS_PATH (or /opt/pw-browsers), then whatever
   playwright-core can find on its own. */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function findChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  let dirs = [];
  try {
    dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium-'));
  } catch (e) {
    return undefined;
  }
  // highest build number wins
  dirs.sort((a, b) => parseInt(b.split('-')[1], 10) - parseInt(a.split('-')[1], 10));
  for (const d of dirs) {
    for (const rel of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
      const p = path.join(root, d, rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

module.exports = { findChromium, APP_URL: pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href };
