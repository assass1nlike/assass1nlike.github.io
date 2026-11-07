以 `base-music.mp3`（Syuenn《big song (self insert)》）前 3 分钟为配乐的纯视觉音乐视频，1920×1080 60fps，无文字。画面全部由 GPU shader 实时计算，按音乐分析结果逐帧驱动。

## 音乐结构

`tools/analyze.py` 的结果：95.50 BPM，一拍 0.6283 s，一小节 2.513 s，第 0 小节从 0.068 s 开始。节拍网格是在全曲上搜索"使起音强度在网格点上总和最大"的匀速周期和相位得到的；逐拍检测在切分节奏多的段落会跳拍，不能直接用。按波形实测，drop 段低频包络最陡的上升点在网格拍点前 10 ms 以内。

段落（小节号 → 秒）：前奏 0–4（0–10.1）；首次进入 4–8；第一大段 8–16；重低音律动 16–24（小节 20 抽空）；变奏 24–28；铺垫 28–32（小节 32 抽空）；第一次 drop 33–40（小节 36 抽空）；间奏 40–44；第二次铺垫 44–48；律动 48–56；变奏铺垫 56–60；终段高潮 60–68；收尾 68–72。

## 画面如何跟音乐走

- 每拍：画面缩放冲击、亮度和辉光脉冲，强度取这一拍的低频量；隧道光环、分形发光带、网格光波等每拍向前推进一格。
- 强低频起音（检测值超过阈值的底鼓/贝斯）：震屏、镜头侧倾、色差、前进速度瞬时加速。
- 军鼓类中高频起音：横条错位的故障效果。
- 段落交界：闪白硬切；抽空的小节用定格重复（stutter）、故障和反色；drop 前一小节核心收缩、最后一拍变白。
- 段落强度决定后期效果总量；终段每 2 拍、最后 4 小节每拍切一个镜头。

8 个场景在 `render/shaders/scene_*.glsl`：`warp` 超空间星流、`tunnel` 霓虹隧道、`fractal` 分形飞越、`kaleido` 万花筒、`cubes` 立方体城市、`core` 脉冲核心、`liquid` 液态等值线、`grid` 合成波网格地形。段落到镜头的安排、配色和各段后期参数都在 `render/timeline.js` 的 `PARTS` 里。

## 目录

- `tools/analyze.py`：音乐分析 → `build/music.json`；`tools/contact.py`：截图拼联系表；`tools/synccheck.py`：画面变化与低频起音的互相关。
- `render/music.js`：任意时刻的音乐信号；`render/timeline.js`：时间轴；`render/engine.js`：WebGL2 管线（场景子帧叠加做运动模糊 → 拖尾 → 辉光 → 合成）；`render/render.mjs`：用无头 Chrome 逐帧渲染并交给 ffmpeg。
- `build/`：中间产物，可删。`out/cool-video.mp4`：成片。

## 制作

环境沿用 autovideo 的 conda 环境（`D:/anaconda/envs/autovideo`：librosa、imageio-ffmpeg、pillow、scipy），Node 依赖 `npm install`，渲染用本机 Chrome（`--use-angle=d3d11` 走 GPU）。

```bash
ffmpeg -i base-music.mp3 -t 180 -vn -c:a pcm_s16le -ar 44100 build/music.wav   # ffmpeg 用 imageio-ffmpeg 自带的
python tools/analyze.py build/music.wav 60
node render/render.mjs --stills 20,83 [--force fractal,3,fire]   # 截图检查；--force 替换成指定场景
node render/render.mjs --from 78 --to 100                         # 渲染一段（带音乐）到 build/part-av.mp4
node render/render.mjs                                            # 全片 → out/cool-video.mp4，Arc 核显上约 25 分钟
```

音乐和成片不进 git。
