// 逐帧渲染画面。
// 用法：node pipeline/render.mjs [--fps 30] [--stills 3.5,20,41] [--from 60 --to 90]
//   默认输出 build/silent.mp4 和 build/sfx.json；--stills 只截指定时刻到 build/stills/；--from/--to 只渲染一段到 build/part.mp4
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const fps = Number(opt('fps', 30));
const stills = opt('stills', null);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PY = 'D:/anaconda/envs/autovideo/python.exe';
const FFMPEG = execFileSync(PY, ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();

const build = path.join(root, 'build');
const TL = JSON.parse(fs.readFileSync(path.join(build, 'timeline.json'), 'utf8'));
const DATA = {};
for (const f of fs.readdirSync(path.join(root, 'data')).filter(f => f.endsWith('.json'))) {
  DATA[f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
}

// assets/ 下的图片直接用；视频片段先抽成 build/frames/<名字>/ 下的逐帧 jpg（源文件更新过才重抽）
const assetDir = path.join(root, 'assets');
const ASSETS = { images: {}, clips: {} };
const prompts = path.join(assetDir, 'prompts.json');
if (fs.existsSync(prompts)) DATA.prompts = JSON.parse(fs.readFileSync(prompts, 'utf8'));
for (const f of fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : []) {
  const name = f.replace(/\.[^.]+$/, ''), src = path.join(assetDir, f);
  if (/\.(jpe?g|png|webp)$/i.test(f)) ASSETS.images[name] = pathToFileURL(src).href;
  if (/\.mp4$/i.test(f)) {
    const dir = path.join(build, 'frames', name), stamp = path.join(dir, '.src');
    const mtime = String(fs.statSync(src).mtimeMs);
    if (!fs.existsSync(stamp) || fs.readFileSync(stamp, 'utf8') !== mtime) {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      execFileSync(FFMPEG, ['-v', 'error', '-i', src, '-vf', `fps=${fps},scale=1920:-2`, '-q:v', '3', path.join(dir, '%04d.jpg')]);
      fs.writeFileSync(stamp, mtime);
    }
    const n = fs.readdirSync(dir).filter(x => x.endsWith('.jpg')).length;
    ASSETS.clips[name] = { dir: pathToFileURL(dir).href, n, fps };
  }
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
page.on('console', m => console.log('[page]', m.text()));
await page.goto(pathToFileURL(path.join(here, 'page.html')).href);
await page.evaluate(([tl, data, assets]) => { window.TL = tl; window.DATA = data; window.ASSETS = assets; }, [TL, DATA, ASSETS]);
await page.addScriptTag({ path: path.join(here, 'lib.js') });
await page.addScriptTag({ path: path.join(root, 'scene.js') });
await page.evaluate(async () => {
  await Promise.all(FONTS.map(f => document.fonts.load(f, '船时0123.Ag')));
  const bad = []; document.fonts.forEach(f => { if (f.status !== 'loaded' && f.status !== 'unloaded') bad.push(`${f.family} ${f.status}`); });
  if (bad.length) throw new Error(`fonts not loaded: ${bad.join(', ')}`);
  await loadAssets();
  if (typeof setup === 'function') await setup();
});

const grab = t => page.evaluate(async t => {
  await renderFrame(t);
  return document.getElementById('c').toDataURL('image/jpeg', 0.94).split(',')[1];
}, t);

if (stills) {
  const dir = path.join(build, 'stills');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const s of stills.split(',').map(Number)) {
    fs.writeFileSync(path.join(dir, `${s.toFixed(2).padStart(6, '0')}.jpg`), Buffer.from(await grab(s), 'base64'));
  }
  console.log(`stills → ${dir}`);
} else {
  const from = Number(opt('from', 0)), to = Number(opt('to', TL.duration));
  const partial = args.includes('--from') || args.includes('--to');
  const f0 = Math.round(from * fps), f1 = Math.ceil(to * fps);
  const out = path.join(build, partial ? 'part.mp4' : 'silent.mp4');
  const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-color_range', 'tv', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const buf = Buffer.from(await grab(f / fps), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % (fps * 10) === 0) console.log(`frame ${f}/${f1}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  const sfx = await page.evaluate(() => (typeof SFX === 'undefined' ? [] : SFX));
  fs.writeFileSync(path.join(build, 'sfx.json'), JSON.stringify(sfx));
  console.log(`done → ${out}`);
}
await browser.close();
