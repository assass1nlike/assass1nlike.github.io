// 逐帧渲染画面。
// 用法：node pipeline/render.mjs videos/<name> [--fps 30] [--stills 3.5,20,41] [--cover]
//   默认输出 build/silent.mp4 和 build/sfx.json；--stills 只截指定时刻到 build/stills/；--cover 画封面到 out/cover.jpg
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const videoDir = path.resolve(args[0]);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const fps = Number(opt('fps', 30));
const stills = opt('stills', null);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PY = 'D:/anaconda/envs/autovideo/python.exe';
const FFMPEG = execFileSync(PY, ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

const build = path.join(videoDir, 'build');
const TL = JSON.parse(fs.readFileSync(path.join(build, 'timeline.json'), 'utf8'));
const DATA = {};
for (const f of fs.readdirSync(videoDir).filter(f => f.endsWith('.json'))) {
  DATA[f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(videoDir, f), 'utf8'));
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
page.on('console', m => console.log('[page]', m.text()));
await page.goto(pathToFileURL(path.join(here, 'page.html')).href);
await page.evaluate(([tl, data]) => { window.TL = tl; window.DATA = data; }, [TL, DATA]);
await page.addScriptTag({ path: path.join(here, 'lib.js') });
await page.addScriptTag({ path: path.join(videoDir, 'scene.js') });
await page.evaluate(async () => {
  await Promise.all(FONTS.map(f => document.fonts.load(f, '集齐0123.A')));
  const bad = []; document.fonts.forEach(f => { if (f.status !== 'loaded') bad.push(`${f.family} ${f.weight} ${f.status}`); });
  if (bad.length) throw new Error(`fonts not loaded: ${bad.join(', ')}`);
  if (typeof setup === 'function') await setup();
});

const grab = t => page.evaluate(t => {
  render(t);
  return document.getElementById('c').toDataURL('image/jpeg', 0.94).split(',')[1];
}, t);

if (args.includes('--cover')) {
  const outDir = path.join(videoDir, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const b64 = await page.evaluate(() => {
    const c = document.getElementById('c');
    drawCover(c.getContext('2d'));
    return c.toDataURL('image/jpeg', 0.95).split(',')[1];
  });
  fs.writeFileSync(path.join(outDir, 'cover.jpg'), Buffer.from(b64, 'base64'));
  console.log(`cover → ${outDir}`);
} else if (stills) {
  const dir = path.join(build, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const s of stills.split(',').map(Number)) {
    fs.writeFileSync(path.join(dir, `${s.toFixed(2).padStart(6, '0')}.jpg`), Buffer.from(await grab(s), 'base64'));
  }
  console.log(`stills → ${dir}`);
} else {
  const n = Math.ceil(TL.duration * fps);
  const out = path.join(build, 'silent.mp4');
  const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-color_range', 'tv', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    const buf = Buffer.from(await grab(f / fps), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (fps * 10) === 0) console.log(`frame ${f}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  const sfx = await page.evaluate(() => (typeof SFX === 'undefined' ? [] : SFX));
  fs.writeFileSync(path.join(build, 'sfx.json'), JSON.stringify(sfx));
  console.log(`done → ${out}`);
}
await browser.close();
