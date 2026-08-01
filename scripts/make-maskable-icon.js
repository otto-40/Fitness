/* Renders icons/icon-maskable-512.png from icons/icon-512.png.

   Android crops any non-maskable icon to a circle, which eats the edges of
   the badge. A maskable icon has to keep its content inside the middle 80%
   ("safe zone") and fill the rest with background, so this pads the badge
   onto the brand navy at 72% scale.

   One-off: run `node scripts/make-maskable-icon.js` if the source icon
   changes. It needs the same Chromium the tests use. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { findChromium } = require('../tests/browser');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'icons', 'icon-512.png');
const OUT = path.join(ROOT, 'icons', 'icon-maskable-512.png');
const SIZE = 512;
/* The badge is a rounded square, so it survives the circular crop only while
   its half-diagonal clears the radius: 0.70 * 512/2 * √2 ≈ 253 < 256. Any
   larger and Android shaves the tile's corners, which is the problem a
   maskable icon exists to avoid. */
const SCALE = 0.7;

(async () => {
  const browser = await chromium.launch({ executablePath: findChromium() });
  const page = await browser.newPage();
  const dataUri = 'data:image/png;base64,' + fs.readFileSync(SRC).toString('base64');

  const out = await page.evaluate(
    async ({ dataUri, SIZE, SCALE }) => {
      const img = new Image();
      img.src = dataUri;
      await img.decode();

      /* Sample the badge's own tile colour just inside its top edge and pad
         with that, so the added margin reads as more tile rather than a
         second background with a visible seam around it. */
      const probe = document.createElement('canvas');
      probe.width = img.width;
      probe.height = img.height;
      const pctx = probe.getContext('2d');
      pctx.drawImage(img, 0, 0);
      const px = pctx.getImageData(Math.round(img.width / 2), Math.round(img.height * 0.12), 1, 1).data;
      const bg = 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')';

      const c = document.createElement('canvas');
      c.width = c.height = SIZE;
      const ctx = c.getContext('2d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, SIZE, SIZE);
      const d = SIZE * SCALE;
      ctx.drawImage(img, (SIZE - d) / 2, (SIZE - d) / 2, d, d);
      return { b64: c.toDataURL('image/png').split(',')[1], bg: bg };
    },
    { dataUri, SIZE, SCALE }
  );
  const b64 = out.b64;
  console.log('padded with ' + out.bg + ' sampled from the badge');

  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + fs.statSync(OUT).size + ' bytes)');
  await browser.close();
})();
