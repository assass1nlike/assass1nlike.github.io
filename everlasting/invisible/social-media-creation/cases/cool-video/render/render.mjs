// 逐帧渲染。
// 用法：node render/render.mjs [--stills 12.5,40] [--force scene,var,pal] [--from 80 --to 95] [--ss 3]
//   --stills 只截指定时刻到 build/stills/；--force 用指定场景替换时间轴上的镜头（调场景用）；
//   --from/--to 只渲染一段到 build/part.mp4；不带这些参数时渲染全片并合成音频到 out/cool-video.mp4。
//   --ss 每帧的子帧数（运动模糊 + 抗锯齿），默认 3。
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const FPS = 60, DUR = 180;
const nSub = Number(opt('ss', 3));
const stills = opt('stills', null), force = opt('force', null);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PY = 'D:/anaconda/envs/autovideo/python.exe';
const FFMPEG = execFileSync(PY, ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const build = path.join(root, 'build');

const MUSIC = JSON.parse(fs.readFileSync(path.join(build, 'music.json'), 'utf8'));
const SHADERS = {};
for (const f of fs.readdirSync(path.join(here, 'shaders'))) SHADERS[f.replace(/\.glsl$/, '')] = fs.readFileSync(path.join(here, 'shaders', f), 'utf8');

const browser = await chromium.launch({ executablePath: CHROME, headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--disable-renderer-backgrounding'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
page.on('console', m => console.log('[page]', m.text()));
await page.goto(pathToFileURL(path.join(here, 'page.html')).href);
await page.evaluate(([m, s, f]) => { window.MUSIC = m; window.SHADERS = s; window.FORCE = f; }, [MUSIC, SHADERS, force ? force.split(',').map((x, i) => i === 1 ? Number(x) : x) : null]);
for (const f of ['music.js', 'timeline.js', 'engine.js']) await page.addScriptTag({ path: path.join(here, f) });

const step = (t, n) => page.evaluate(([t, n]) => { renderFrame(t, n); }, [t, n]);
const grab = (t, n) => page.evaluate(([t, n]) => {
  renderFrame(t, n);
  return document.getElementById('c').toDataURL('image/jpeg', 0.95).split(',')[1];
}, [t, n]);

if (stills) {
  const dir = path.join(build, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const s of stills.split(',').map(Number)) {
    // 拖尾依赖前面的帧：先从 0.4 秒前开始预跑
    await page.evaluate(() => resetTrail());
    for (let t = Math.max(0, s - 0.4); t < s - 1e-6; t += 1 / FPS) await step(t, 1);
    const name = (force ? force.split(',')[0] + force.split(',')[1] + '_' : '') + s.toFixed(2).padStart(6, '0') + '.jpg';
    fs.writeFileSync(path.join(dir, name), Buffer.from(await grab(s, nSub), 'base64'));
  }
  console.log(`stills → ${dir}`);
} else {
  const partial = args.includes('--from') || args.includes('--to');
  const from = Number(opt('from', 0)), to = Number(opt('to', DUR));
  const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
  const out = path.join(build, partial ? 'part.mp4' : 'silent.mp4');
  const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', partial ? 'veryfast' : 'slow', '-crf', partial ? '20' : '16',
    '-color_range', 'tv', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  await page.evaluate(() => resetTrail());
  for (let t = Math.max(0, from - 0.4); t < from - 1e-6; t += 1 / FPS) await step(t, 1);
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const buf = Buffer.from(await grab(f / FPS, nSub), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % (FPS * 5) === 0) console.log(`frame ${f}/${f1}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  const outs = [out];
  // 带上对应时段的音乐，方便检查同步
  const final = partial ? path.join(build, 'part-av.mp4') : path.join(root, 'out', 'cool-video.mp4');
  fs.mkdirSync(path.dirname(final), { recursive: true });
  const afade = partial ? [] : ['-af', `afade=t=out:st=${DUR - 3.8}:d=3.8`];
  execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', out, '-ss', String(from), '-t', String(to - from), '-i', path.join(build, 'music.wav'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', ...afade, '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', final]);
  console.log(`done → ${final}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
await browser.close();
