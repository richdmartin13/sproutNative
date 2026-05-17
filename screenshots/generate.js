const puppeteer = require('C:/Users/rich/AppData/Roaming/npm/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = path.join(__dirname, 'output');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  // iPhone 6.7" (1284×2778 @ 3x) — accepted by App Store Connect
  { html: 'mockup-home.html',      out: 'iphone-home.png',       w: 428, h: 926,  s: 3 },
  { html: 'mockup-analytics.html', out: 'iphone-analytics.png',  w: 428, h: 926,  s: 3 },
  { html: 'mockup-tap.html',       out: 'iphone-tap.png',        w: 428, h: 926,  s: 3 },
  // iPad Pro 12.9" (2048×2732 @ 2x)
  { html: 'mockup-home.html',      out: 'ipad-home.png',         w:1024, h:1366,  s: 2 },
  { html: 'mockup-analytics.html', out: 'ipad-analytics.png',    w:1024, h:1366,  s: 2 },
  { html: 'mockup-tap.html',       out: 'ipad-tap.png',          w:1024, h:1366,  s: 2 },
  // Apple Watch 45mm (396×484 @ 2x)
  { html: 'mockup-watch-list.html',out: 'watch-list.png',        w: 198, h: 242,  s: 2 },
  { html: 'mockup-watch-log.html', out: 'watch-log.png',         w: 198, h: 242,  s: 2 },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  for (const shot of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: shot.w, height: shot.h, deviceScaleFactor: shot.s });
    const url = 'file:///' + path.join(__dirname, shot.html).replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 800)); // allow fonts + JS to settle
    const outPath = path.join(OUT, shot.out);
    await page.screenshot({ path: outPath, type: 'png' });
    const { width, height } = await page.evaluate(() => ({
      width: window.innerWidth * window.devicePixelRatio,
      height: window.innerHeight * window.devicePixelRatio,
    }));
    console.log(`✓  ${shot.out}  (${width}×${height}px)`);
    await page.close();
  }

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUT}`);
})();
