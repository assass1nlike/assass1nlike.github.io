[TOC]

**论文阅读**：PDF-XChange Editor

**火狐浏览器暗色阅读**：Dark Reader 插件

**有粗细的笔写字**：Win+R，输入 `services.msc` 然后选择 Wacom Professional Service，右键启动

**给 typora 更多功能的 typora plugin**：

1. 从 https://github.com/obgnail/typora_plugin/releases/latest 下载最新压缩包并解压。

2. 打开 Typora 安装目录，找到包含 `window.html` 的文件夹，正式版通常是 `resources`。

3. 把解压得到的 `plugin` 文件夹复制进去。

4. 进入 `plugin/bin`，右键 `install_windows.ps1`，选择“使用 PowerShell 运行”，然后重启 Typora。

5. 如果插件还没加载成功，在 PowerShell 中执行：

   ```
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Typora\resources\plugin\bin\install_windows.ps1"
   ```

   出现管理员权限提示时允许，确认脚本显示 `Plugin installed successfully!`.

**让 typora 的背景为更深的黑色**：

1. 打开 Typora 自身的偏好设置 → 外观 → 打开主题文件夹。

2. 新建 `base.user.css`；如果已有这个文件，就在末尾追加：

   ```css
   :root {
     --bg-color: #181818;
     --side-bar-bg-color: #181818;
   }
   
   html, body, content, #write, #typora-sidebar {
     background-color: #181818 !important;
   }
   ```

3. 保存并重启 Typora 即可

去防御性表达：https://github.com/Kiterlin/anti-defensive-writing





中稿预测市场：[AcceptOdds](https://acceptodds.com)

ICLR2027 总结：https://yzc-666.github.io/iclr2027-explorer



看自己的邮箱密码是不是泄露了：https://haveibeenpwned.com/

# information retrieval

## preprint

最好的预印本平台基本就是所在领域的默认平台，因为预印本的价值来自有人看。

### 默认高地位

**arXiv** 覆盖物理、数学、计算机、统计和定量生物学。这几个领域的几乎所有重要工作都会先挂在上面，挂 arXiv 已经是惯例而不是额外动作。计算机方向尤其如此，顶会论文和 arXiv 版本基本同步存在。

**bioRxiv** 是生命科学基础研究的默认平台。
**medRxiv** 覆盖临床医学、流行病学和公共卫生，体量小一些，但在临床研究里已经是标准动作（COVID 期间它的地位被彻底确立）。

### 一些领域内的标准选择

特点是：不挂也不会有人质疑，但挂了就有明确的目标读者，同行会去那里找。

- **ChemRxiv** 覆盖化学与材料，是化学界公认的那一个。
- **PsyArXiv** 覆盖心理学及相关神经科学，社区运营，预印本超过 5.8 万篇。
- **EarthArXiv** 覆盖地球、行星与环境科学。
- **SSRN** 覆盖社科、法学、经济和商科，（被 Elsevier 收购后覆盖面很广，）经济学和法学的工作大多挂在这里。
- 工程方向有 **engrXiv** 和 IEEE 的 **TechRxiv**，密码学有一个专门的老平台 **Cryptology ePrint Archive**，密码学圈的论文基本都走它。

### 托管型或平台型

这类不绑定学科，作用是给一个通用落点。
**Research Square** 与 BMC、Springer Nature 的投稿流程打通，投稿时可以直接选择同步发预印本。
**OSF Preprints** 是托管方，SocArXiv、EdArXiv、MetaArXiv 这些社区平台都建在它上面。
**Preprints.org**，全学科通用。
**ChinaXiv** 由中科院运营，是国内最主要的中文与英文预印本平台，中国的作者如果想走国内渠道或者做中文成果，它是一个实际选项。

这一档的用途是兜底：你的工作确实归不进任何领域平台，或者你想要投稿流程里的自动同步。

# writing

### AI conference paper

- https://github.com/Master-cai/Research-Paper-Writing-Skills

  指导具体到论文内容，e.g.：

  - **Introduction**：如何交代任务、现有方法...
  - **Method**：每个模块分别讲清楚怎样运行、为什么需要...
  - **修改与自审**：检查段落之间的逻辑，从审稿人角度检查...
  
  适合已有方法和实验，希望 agent 帮忙组织论证、撰写或修改各章节。
  
- https://github.com/Orchestra-Research/AI-Research-SKILLs/tree/main/20-ml-paper-writing/ml-paper-writing

  比较完整的会议投稿流程。让 agent 从代码、实验结果、研究笔记等理解工作，再组织论文。可以把“研究 repo → 论文初稿 → 投稿准备”连起来。

- https://github.com/HKUSTDial/Supervisor-Skills/blob/main/skills/benchmark-paper-template/SKILL.md

  针对 benchmark 论文。

- https://github.com/Leey21/awesome-ai-research-writing

  有很多在论文写作时好用的 prompt 参考.

### tech

- https://github.com/Fenng/Tech-Doc-Style-Chinese：
  适合中文技术文档的撰写和改写，例如工具说明、操作手册、API 文档和故障分析
- https://github.com/mcollina/skills/blob/main/skills/documentation/SKILL.md：
  根据读者目的，将内容组织成入门教程、任务指南、参考资料或原理解释，避免不同用途混杂。
  适合规划和重整一套项目文档或教程，尤其是内容很多、读者却难以找到所需信息的情况。

### general

1. https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md：
   重点是让没有参与写作的新模型阅读。
   会多问一些背景信息问题（e.g. 明确读者和写作目标），走较长流程写一个文档。
2. https://github.com/softaworks/agent-toolkit/tree/main/skills/writing-clearly-and-concisely：
   突出段落主题、采用具体表达、删除冗余等。适合内容已经齐全，但表达绕、重点不突出的文本等
3. https://github.com/op7418/Humanizer-zh：
   编辑已有中文文本，清理空话、重复、模板化句式和多余的聊天包装，同时保留原意与确定程度。
   适合成稿前做点语言清理，主要改善表达。
