《对表》：约 4 分 30 秒的硬科幻短片，物理课大作业。故事、分镜和片中涉及的相对论知识见 [story.md](story.md)。

画面一半是代码绘制（近光速星空、时空图、仪表等），一半是阿里云百炼通义万相生成的静帧和几段动态镜头；旁白用 Edge TTS，配乐和音效由代码合成。

## 目录

- `story.md`：故事与分镜。`script.json`：旁白稿，每句可写 `say`（读法）和 `hold`（句后停顿）。
- `physics.py`：算出片中所有相对论数字，写入 `data/physics.json`。`data/blackbody.json` 是星光多普勒着色用的黑体颜色表，由 `pipeline/blackbody.py` 生成。
- `scene.js`：全片画面，按旁白时间轴对齐。
- `assets/`：AI 画面。`prompts.json` 是提示词，`<名字>.jpg` 是选定的静帧，`<名字>.mp4` 是动态镜头；缺图的位置会画占位卡。
- `pipeline/`：配音、渲染、生成、合成脚本。
- `build/`：中间产物，可删。`out/duibiao.mp4`：成片。

## 制作

环境沿用 autovideo 的 conda 环境（`D:/anaconda/envs/autovideo`，另需 scipy、requests），Node 依赖 `npm install`，渲染用本机 Chrome。

```bash
python physics.py                     # 相对论数字
python pipeline/voice.py .            # 旁白 → build/narration.wav、build/timeline.json
python pipeline/gen.py img [名字]      # 生成候选静帧（需要 dashscope.key），sheet 查看，pick 选定
python pipeline/gen.py clip <名字>     # 由选定静帧生成动态镜头
node pipeline/render.mjs --stills 20,80   # 截几帧检查；python pipeline/contact.py . 拼成联系表
node pipeline/render.mjs              # 渲染全片画面，约 40 分钟
python pipeline/mux.py                # 合成旁白、配乐、音效 → out/duibiao.mp4
```

`dashscope.key`（百炼 API key）不进 git。
