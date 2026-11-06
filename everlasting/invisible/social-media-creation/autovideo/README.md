仿照 B 站「算法之外_」形式的数据/模拟类短科普视频：生活问题开头，用真实研究或程序模拟“算一遍”，1~2 分钟，代码绘制的 2D 动画。

有两种模式。**配乐模式**（现在的默认做法，和原 UP 主一致）：没有人声，全片配同一首曲子《千年之后（氛围版）》，字幕按节拍出现，大转场和关键数字放在曲子的段落交界处。**旁白模式**：Edge TTS 配音，代码合成背景音乐和音效（第一条 `videos/blindbox` 用的是这个）。

## 目录

`pipeline/` 是所有视频共用的流水线，`music/` 放固定配乐和它的节拍分析，`videos/<名字>/` 是单条视频：

- `script.json`：字幕稿。每个场景一组句子。
  - 配乐模式写 `"music": "qiannian"` 和全片结尾 `"end"`（秒）；每个场景用 `"at"` 指定起点，会吸附到最近的小节线。每句默认占 4 拍（一小节，约 2.1 秒），字多自动变 6 或 8 拍，也可以写 `{"text", "beats"}` 指定；`"silent": true` 的句子不出底部字幕（用于画面中央的大字）。
  - 旁白模式写 `"voice"`；某句读法和字幕不同时用 `{"text", "say"}`，两者标点必须一致。
- `scene.js`：画面。定义 `drawBackground`、`SCENES[场景id]`，可选 `setup`、`drawOverlay`、`drawCover`、`SFX`。对齐时间用 `lineAt(场景id, 第几句)`（字幕出现的时刻）或 `cue(场景id, 词)`；配乐模式下还有 `musicLevel(t)`（响度）、`beatPulse(t)`、`barPulse(t)`、`beatAfter(t, k)`。
- 其它 `*.json`（如模拟结果 `sim.json`）会以 `DATA.<文件名>` 注入画面。
- `build/`：中间产物，可随时删掉重建。`out/`：成片、封面、简介。

## 制作一条视频

环境：conda 环境 `autovideo`（python 3.11，numpy、pillow、edge-tts、imageio-ffmpeg、librosa），Node 依赖 `playwright-core`（驱动本机 Chrome），字体用系统里的思源宋体 Heavy、Noto Serif SC、Noto Sans SC。

```bash
conda activate autovideo
python pipeline/beats.py videos/exposure                      # 配乐模式：字幕稿 → 时间轴（会打印每段剩余拍数）
python pipeline/voice.py videos/blindbox                      # 旁白模式：讲稿 → 配音、时间轴
node pipeline/render.mjs videos/exposure --stills 5,20,40     # 截几个时刻检查画面
python pipeline/contact.py videos/exposure                    # 截图拼成联系表
node pipeline/render.mjs videos/exposure                      # 渲染全片画面（无声）
node pipeline/render.mjs videos/exposure --cover              # 封面
python pipeline/mux.py videos/exposure                        # 合成声音
```

## 哪些文件进 git

仓库是公开的，而且 GitHub Pages 会把这个目录原样发布到网站上，所以只提交能公开、体积小、无法自动重建的东西：流水线代码、每条视频的字幕稿、画面、模拟脚本和数据、封面和简介。`build/` 和 `node_modules/` 可以随时重建；成片 mp4 体积大、含版权音乐，只留在本地；配乐音频不能公开分发，也不提交。换一台机器时，把 `qiannian.m4a` 放回 `music/`，就能从头重建任何一条视频。

## 配乐

`music/qiannian.m4a` 是和乐府《千年之后（氛围版）》的前 121 秒，取自原 UP 主视频的音轨（只有这首曲子），所以视频最长约 118 秒。`music/qiannian.json` 由 `music/analyze.py` 生成：112 BPM，一拍 0.534 秒，曲子在 17.41、34.76、95.50 秒有明显的起势，段落分界约在 8.73、17.41、30.42、34.76、60.79、65.13、78.16、91.16、95.50 秒。换曲子时跑一遍 `python music/analyze.py music/<曲名>.m4a` 即可。
