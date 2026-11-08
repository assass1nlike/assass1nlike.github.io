科幻短片，物理课大作业。每部片子一个目录，共用 `pipeline/` 里的制作流水线：

- `duibiao/`：《对表》，近光速飞往外星文明，4 分 08 秒，已完成。
- `wanxing/`：《晚星》，载人登陆火星，制作中。

每部片子的故事与分镜见各自的 `story.md`。画面一半是代码绘制，一半是阿里云百炼通义万相生成的静帧和动态镜头；旁白用 Edge TTS，配乐和音效由代码合成。

## 一部片子的目录

- `story.md`：故事与分镜。`script.json`：旁白稿，每句可写 `say`（读法）、`hold`（句后停顿）、`voice`/`rate`/`pitch`（人物台词换声音），每个场景可写 `music`（配乐强弱 0~1）。
- `physics.py`：算出片中用到的数字，写入 `data/`。`data/` 下的 json 会以 `DATA.<文件名>` 注入画面。
- `scene.js`：全片画面，按旁白时间轴对齐。
- `assets/`：AI 画面。`prompts.json` 是提示词，`<名字>.jpg` 是选定的静帧，`<名字>.mp4` 是动态镜头；缺图的位置会画占位卡。
- `build/`：中间产物，可删。`out/<目录名>.mp4`：成片。

## 制作

环境沿用 autovideo 的 conda 环境（`D:/anaconda/envs/autovideo`，另需 scipy、requests），Node 依赖 `npm install`，渲染用本机 Chrome。以下命令都在本目录下运行，`<片>` 是片子的目录名：

```bash
python <片>/physics.py                  # 片中的数字
python pipeline/voice.py <片>           # 旁白 → build/narration.wav、build/timeline.json
python pipeline/gen.py <片> img [名字]   # 生成候选静帧（需要 dashscope.key）；sheet 查看候选，pick 选定
python pipeline/gen.py <片> clip <名字>  # 由选定静帧生成动态镜头
node pipeline/render.mjs <片> --stills 20,80   # 截几帧检查；python pipeline/contact.py <片> 拼成联系表
node pipeline/render.mjs <片>           # 渲染全片画面，约 15 分钟
python pipeline/mux.py <片>             # 合成旁白、配乐、音效 → out/<片>.mp4
```

`dashscope.key`（百炼 API key）不进 git。
