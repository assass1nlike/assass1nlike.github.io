以 `base-music.mp3` 前 3 分钟为配乐的 3D CG 跑酷空翻短片，1920×1080 60fps（画面 2.39:1 宽银幕）。几个固定主角轮换，在不同场景里利用地形做高难度的旋转和空翻，动作卡在音乐的拍点上。全部由代码在 Blender 里生成和渲染。

## 怎么做出来的

- **角色**：MakeHuman（MPFB 扩展）生成三个穿运动服的人物（Kai、Rin、Milo），带 CMU 骨架；皮肤用次表面散射材质，衣服保留原贴图的褶皱细节、统一成角色主色。
- **动作**：两种来源拼接。
  - Mixamo 和 CMU 的动捕（跑、冲刺、蹬墙后空翻、跑动前空翻转体等）重定向到角色骨架后，按指定的时刻、位置、朝向接起来。片段之间的位移修正只加在双脚离地的帧里，落脚点不会滑动。
  - 动捕里没有的高难招式（double cork、跨楼转体、double back 等）由物理化的生成器计算：腾空段质心走抛物线，起跳和落地点由地形决定；空翻、转体的角速度与转动惯量成反比，团身时转得快；总圈数归一化到招式要求。落地时把身体绕脚转到合理的重心位置。
- **卡点**：动作时间与屏幕时间分开。关键动作（起跳、蹬墙、落地）按拍点排在动作时间里；空中的慢放用单调三次插值做变速，保证变速前后的落地仍在重拍上。
- **场景**：程序化建模加 Poly Haven 的 CC0 模型和贴图。
  - 雨后霓虹楼顶：湿屋面倒映霓虹，场景里有空调外机、风管、蒸汽和霓虹招牌；周围的程序化楼群窗户逐格随机亮灯，加高度雾。
  - 黄昏红砂岩峡谷：分层砂岩，扫描崖壁做细节，逆光落日。
- **镜头**：每个镜头是跟随角色的程序化相机，带手持晃动、落地冲击震动、景深和运动模糊。EEVEE 渲染，合成器加 bloom 和轻微色散，剪辑时加暗角、颗粒、drop 处闪白。

## 目录

- `src/`：Blender 内外共用的代码。
  - `skel.py`：骨架和正向运动学。`quat.py`：四元数工具。
  - `bvh.py`、`mixamo.py`：动捕读取和重定向。`clips.py`：动捕片段库。
  - `pose.py`：关键姿势。`perf.py`：表演编排（片段拼接、跳跃生成器、脚部 IK）。
  - `demo.py`：各角色的表演。`shots.py`：镜头表。`camera.py`：变速和相机工具。`layout.py`：和动作有关的地形尺寸。
  - `chars.py`、`look.py`：角色生成和材质。
  - `world.py`、`props.py`：场景基础工具。`scenes/`：各场景。
  - `render_shot.py`：渲染一个镜头。`bake.py`：把动作写成骨架关键帧。
- `tools/`：素材下载（`fetch.sh`、`ph_fetch.py`、`mixamo_fetch.py`）、`mixamo_bake.py`、预览和拼图（`preview.py`、`sheet.py`）、`assemble.py`（剪辑合成）、`analyze.py`（音乐分析）。
- `vendor/`：第三方素材（不进 git）。`build/`：中间产物，可删。`out/`：成片。

## 制作

依赖：便携版 Blender 5.2（`D:/tools/blender`，装 MPFB 扩展）、autovideo conda 环境（`D:/anaconda/envs/autovideo`：librosa、imageio-ffmpeg、pillow、yt-dlp）。网络请求走本机代理 127.0.0.1:7890。

```bash
bash tools/fetch.sh                                   # MPFB、MakeHuman 素材包、CMU 动捕 → vendor/
blender -b --python tools/mh_install.py               # 素材包装进 MPFB
python tools/ph_fetch.py                              # Poly Haven 贴图、HDRI、模型
python tools/mixamo_fetch.py <mixamo access_token>    # Mixamo 动作（token 见脚本说明，不落盘）
blender -b --python tools/mixamo_bake.py              # FBX → build/mixamo/*.npz
blender -b --python src/chars.py                      # 角色 → build/chars/、build/skel/
python tools/analyze.py build/music.wav 60            # 音乐分析 → build/music.json
blender -b --python src/render_shot.py -- A5 --stills 84.0 --pct 50 --tag test   # 检查一帧
blender -b --python src/render_shot.py -- A5          # 渲染一个镜头 → build/frames/A5/
python tools/assemble.py out/demo.mp4 A1 A2 ... B3    # 剪辑合成
```

## 素材授权

MakeHuman 素材包中 `_ccby` 结尾的（shirts02/03、pants02/03、shoes02/03、hair02/03）为 CC BY，发布时需署名 MakeHuman 社区；其余 MakeHuman、Poly Haven 素材为 CC0。CMU 动捕数据库可自由使用。Mixamo 动作按 Adobe 条款可用于商业和非商业作品，但不能单独再分发，所以不进 git。
