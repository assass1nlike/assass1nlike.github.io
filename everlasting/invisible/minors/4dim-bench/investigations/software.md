我把搜到的东西按"能不能直接用"和"能用到什么程度"梳理一下。结论先说：**专门为 4D 嵌入拓扑曲面（Klein 瓶、cross-cap、Roman、Boy 等）做的可视化软件确实有一批，但都是数学家圈子里的小众工具**，且大多产生于 1990s—2000s 的 SIGGRAPH/Vis 黄金时代，今天有些已经几乎废弃。完整列表如下。

## 一、专门的 4D 数学可视化软件（最对口的一类）

**3D-XplorMath / 3DXM-J**（推荐先试）

非营利 NSF 资助的项目，由 Richard Palais 和 Hermann Karcher 主持。3DXM Consortium 是一个国际志愿数学家组织，得到 NSF 支持。**关键是它有专门的 "Non-Orientable Surfaces Gallery"**——是 Surfaces Gallery 下的一个子画廊，里面 Klein 瓶、Roman 曲面、cross-cap 都是 builtin exhibit。Java 版本（3DXM-J）跨平台、免费、还在维护。缺点是 UI 古朴、批量自动化不太友好。

**MeshView**（Andrew Hanson, Indiana University）

可能是历史上最强的 4D 几何可视化工具。交互式可视化系统，专门处理嵌入在 3D 或 4D 中的点、曲线和二维流形，重点处理 4D 对象。所有 3D 和 4D 中的刚体运动都可以通过鼠标（或 3D 鼠标）控制，关键帧动画支持运动和形变。实现了一个 "4D rolling ball" 界面，用 3 个控制参数就能操控 4D 中 6 自由度的旋转方向空间。研究应用包括 4D 视图界面、经典高维几何、Riemann 曲面、双复变函数、4D 四元数表示。C + OpenGL + X/Motif，免费，但你得能在现代系统上把它编译起来——这是 1999 年的代码，今天能跑通基本要在 Linux 下硬调。

**Geomview + 4DView / NDView**（Geometry Center, Minnesota）

Geomview 是 Geometry Center 分发的一个通用曲面查看器，由 Stuart Levy、Tamara Munzner、Mark Phillips 开发。虽然本质是 3D viewer，但 4DView 外部模块（Daeron Meyer）接受 4D 数据点、允许改变 4D 视点、并提供 4D 切片工具。另一个 NDView 模块（Olaf Holt 和 Stuart Levy）通过多个 3D 子空间投影来交互 4 维及以上对象。**这是经典工具**——Banchoff 70 年代开创的 4D 可视化传统的延续。SourceForge 上还有发行版，能跑，但同样是 1990s 的 UI 哲学。

**GL4D**（Alan Chu et al., CUHK）

GPU 加速的 4D 架构，把 4D 几何投影到 3D 图像体积里，包括 4D-to-3D 投影的颜色和深度缓冲做隐面消除，扩展了 Hanson 和 Heng 的工作。还提出了把 2D 曲面和 1D 曲线增厚到可渲染状态的机制。学术原型代码，IEEE TVCG 2009 论文配套。

**KnotPlot**（Rob Scharein）

支持 4D 表面——4 维中的纽结球面和链接球面可以交互式构造。表面可以用 KnotPlot 查看或导出到其他软件。提供了 4dss、4dspangle、4dw 等参数控制 4D 纽结的构造和显示。主要瞄准纽结理论，但 4D 嵌入曲面也是它的目标对象。

**Hui Zhang 等人的 4D 切片工具**（Indiana University）

最相关的现代研究。提出了一个"智能切片工具"，把 4D 嵌入曲面看作堆叠在时间里的一组 3D 曲线，像翻页动画一样，每一帧之间至多差一个 critical change。这个新方法能用最少的 cross-sectional 图表生成拓扑上有意义的可视化。"Visualizing 2-dimensional Manifolds with Curve Handles in 4D"（TVCG 2014）：通过把 3D 图形切成一系列特征图来可视化 4D 曲面的拓扑特征。这正好就是你 benchmark 想做的那种"用视频展示 4D 物体"的方法学源头——他们写过对应论文配套代码。

**Stella4D**（Robert Webb）

更偏多胞形，对 Klein 瓶/cross-cap 这类拓扑曲面**支持有限**——它的强项是 4-polytopes 和均匀星形多胞形，不是任意参数化曲面。

## 二、通用数学软件（用得上但要自己写参数化）

**Mathematica**

最务实的选择。Wolfram Demonstrations 上有现成的 "4D Rotations of a Klein Bottle" demonstration，源代码可下载可改。`ParametricPlot3D` + 自定义的 4D→3D 投影函数三十行能搞定。批量生成视频用 `Manipulate` + `Export[..., "mp4"]`。**对你的工作流最友好**，特别是要程序化生成多种参数下的视频。

**SageMath / Plotly + R**

SOCR DSPA 里有现成的 R + plotly 的 4D 流形可视化方法：通过沿某一维度做时间动画来生成 3D embedding。Klein 瓶有专门的 plot_4d 例子。Python 端用 NumPy + Plotly 完全等价，且容易接到 ML pipeline。

**MATLAB**

内置 klein1 demo，是 Klein 瓶的图形演示。但这是 3D 浸入版，不是 4D 嵌入；你要 4D 还是得自己写。

## 三、网页 / 实时（Three.js / WebGL 生态）

这条线最近几年很热，但都是单人项目，没有"软件"层面的工具：

- **MathBox²**（Steven Wittens / Acko）：支持把原生 4D 点投影到 3D，做镶嵌和现场微分。展示过 Hopf 纤维化的扭曲环面。
- **Tak4d**（raktres.net）：用 Three.js 基于 "double orthogonal projection" 做了一个 4D 迷宫和 4D 空间 viewer，通过四个 3D 视图展示 4D 物体。
- **4D Polytope Viewer**（Pardesco）：1700+ 个均匀 4-多胞形，但**没有 Klein 瓶这类拓扑曲面**。
- 各种 GitHub 上的学生作品：Brown 的 VR 4D 投影器（dani-demeter，在 Banchoff 教授指导下做的 Unity VR 4D 物体投影到 3D 的项目）、个人的 Klein 瓶交互页面等。质量参差但代码可读。

## 四、通用 3D 软件 + 脚本

- **Blender + Python**：原生不支持 4D，但用 bmesh 把每一帧的 3D 网格写进去完全可行；离线批量渲染高质量视频，这是 production 路线。
- **Houdini**：可以用 VEX 写 4D 几何节点，社区里有零散尝试，但没有成型 HDA。
- **OpenSCAD / CadQuery**：CAD 软件，强行写 4D 的人有，但工作量大。

## 五、Banchoff 的历史遗产

值得单独提一下，因为现在很多东西的源头都在这里。**Thomas Banchoff** 自 1970s 起在 Brown 做交互式 4D 可视化，在 1970s 末到 1980s 初制作了 4 维物体的计算机动画电影，比如获奖的《Hypercube》、《The Veronese Surface》，以及 wireframe 版本的《The Hypersphere: Foliations and Projections》。他网页上还有 Klein 瓶在 4-space 中的动画，演示 3D 中的自交曲线在 4D 中如何因第四坐标不同而真正成为无自交嵌入。这些原始动画仍可在 math.brown.edu/tbanchof/ 看到。

J. Scott Carter 的 *How Surfaces Intersect in Space*（1995）是这个领域的圣经——书里用 "movie" 方法（一系列 3D 切片当作翻页动画）描述 4D 嵌入曲面，"Non-orientable surfaces in 4-dimensional space" 这篇综述给出了 4D 嵌入和浸入的标准非定向曲面的详细构造和图示，包括 Klein 瓶、cross-cap、Roman 曲面、Boy 曲面、"girl's surface" 等。**Hui Zhang 那条研究线本质就是把 Carter 的 movie 方法变成自动算法**。这正好是你 benchmark 的理论基础——值得读一下。

## 六、给你工作流的具体推荐

按"能不能马上拿来用"和"能不能批量产生 benchmark 视频"双重标准排序：

1. **快速 prototyping / sanity check**：3D-XplorMath-J 或 Mathematica。前者直接选 menu 里的 Klein bottle / Roman 曲面，参数拖拖看效果；后者是十几行代码出图。
2. **正式的 benchmark 数据生成**：自己写 Python pipeline（NumPy 算 4D 几何 + 4D→3D 投影 + Blender CLI 渲染）。理由是：
   - 你需要程序化变换：旋转参数、投影方式（正交/透视/切片/球极）、视觉风格（线框/半透明/W-着色）的组合爆炸只有脚本能管。
   - 答案要可程序化校验（顶点数、自交存在与否、同胚类型），现成软件做不到。
   - 现成 4D 软件没有一个能批量出 mp4 + 元数据。
3. **借鉴的论文代码**：Hui Zhang 那组的 TVCG 2014 论文和 Liu 2022 Computer Graphics Forum 论文是最贴近你 benchmark 思路的（用切片视频表示 4D 嵌入）。看他们怎么设计 "critical change" 在视频帧之间的过渡，能直接借用作为题目设计的难度梯度。
4. **可以跳过的**：Stella4D（不适合非多胞形）、KnotPlot（专精纽结）、Geomview/MeshView（安装地狱，除非你有十年代 Linux 经验）、Three.js 生态（除非你的 benchmark 是网页交互式的人类基线测试）。

## 一个对你 benchmark 设计有直接价值的观察

Liu 2022 的 paper 提到一个很关键的点：他们的切片工具能用**最少数量**的 cross-section 图来产生拓扑上有意义的可视化。这其实给你 benchmark 的难度调控提供了一个自然的旋钮——**视频帧数与 4D 拓扑信息量的关系**。同一个 Klein 瓶，10 帧切片视频能不能让模型识别？20 帧呢？50 帧呢？人类基线在哪一档开始稳定识别？这是个很漂亮的 scaling 实验。

------

要不要我帮你把 Python 端的 pipeline（4D 参数化 → SO(4) 旋转 → 投影或切片 → Blender 自动化）的具体代码骨架写出来？这样你直接拿去往里填几何就能跑，免得在那些老旧软件上耗时间。