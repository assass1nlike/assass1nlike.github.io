# 留言服务

主页留言使用 `guestbook-config.js` 中的 Supabase 项目。它与秘密空间的 `secret-config.js` 独立配置。

首次初始化时，在新项目的 SQL Editor 中执行根目录 `guestbook-supabase-schema.sql` 全部内容。脚本创建留言表、开放访客读取公开留言和提交留言的权限，并启用行级权限；访客不能读取非公开留言，也不能修改或删除留言。站主可在 Supabase Table Editor 的 `guestbook_messages` 表中查看和管理所有留言。

当前 `authProviders: []` 表示只提供无需登录的匿名留言，不需要开启 Supabase Auth 的 Anonymous Sign-Ins。启用 GitHub / Google 时，先在 Supabase 配置对应 OAuth provider、Site URL 和允许的 Redirect URLs，再把 `authProviders` 设置为 `['github', 'google']`（也可只启用一种）。OAuth callback 为 `https://myrhtqbjnkxqaniuivzm.supabase.co/auth/v1/callback`；网站回跳地址应使用正式 HTTPS 域名。

前端只配置 Publishable key。它放在 `apikey` 请求头，`Authorization` 只在用户登录后携带会话 token。数据库密码、Secret key 和 service_role key 不放入网站文件。

验证前端留言逻辑：`node --test scripts/test-guestbook.cjs`。实际数据库的建表、读写及非公开留言权限还需在新项目初始化后验收。

# GitHub / OneDrive 分区备份

`everlasting/.gitignore` 同时作为 Git 排除规则和 OneDrive 备份清单，路径相对 `everlasting/`，例如 `/research/`、`/everlasting.md`。不要写 `./` 前缀。支持 Git 原生通配符和 `!` 例外；清单文件本身应保留在 GitHub。

```powershell
python scripts/sync-onedrive.py
python scripts/sync-onedrive.py --apply
```

第一条只预览，第二条执行。默认目标是 `C:\Users\15951\OneDrive\everlasting`，可用 `--destination` 指定其他电脑的同名目录。脚本先拉取 `origin`，按远程 `main` 当前提交核对备份；已安装 GitHub CLI 时使用其当前登录账号。

清单内的本地文件按原路径复制到 OneDrive，逐一校验后取消 Git 跟踪，原文件留在本地。清单外的 OneDrive 文件只有在相同路径、相同内容已存在于远程当前版本时才移出备份目录（文本允许 CRLF/LF 差异）。远程缺失或内容不同的副本会保留并列出；本地已删除但 OneDrive 仍存在的文件也保留，避免误删传播。

被替换和清理的旧副本移入 OneDrive 下的 `.everlasting-sync-history/`，可恢复。已在本地删除的清单内文件会先从 Git 暂存区保存旧版本到恢复历史，再取消跟踪。它是独立的恢复历史，不属于当前 `everlasting/` 分区。脚本不提交、不推送、不改写 Git 历史；取消跟踪产生的暂存删除需要正常提交推送。它只能确认本机 OneDrive 副本已写入，云端上传由 OneDrive 客户端完成。

# 文章列表

全站语言按钮由 `site-i18n.js` 管理，默认中文，并在当前浏览器记住选择。它只翻译明确列出的网站界面区域；文章标题、摘要、正文、章节目录、论文文件夹名及用户留言保持原文。动态插入的界面文字也会更新，切换不会重载页面或重置筛选。新增界面文案时补充该文件的 `phrases` / 数量表达规则；正文旁的独立界面提示可标记 `data-site-ui`，不要给 Markdown 正文添加这个标记。

博客、学习的文章入口由根目录 `script.js` 的 `CATEGORY_DEFINITIONS` / `DOC_DEFINITIONS` 管理。技术栏目递归收录 `everlasting/invisible/tech/` 的 Markdown，按一级子目录分组，标题取首个一级标题（没有时使用文件名）。新增、改名、删除技术文章或修改标题后运行 `python scripts/export-tech.py`，随网站部署生成的 `assets/tech/catalog.js`。忽略隐藏目录、符号链接、`AGENTS.md` / `CLAUDE.md`，不读取科研目录；正文仍从原 Markdown 读取。

博客、学习、技术和开源项目共用 `article-library.js` 和 `article-library.css`，从 Markdown 提取摘要、搜索正文。独立分类页每页 6 项，首页预览每页 3 项，只有一页时隐藏分页。主题、内容状态、搜索、排序及页码保留在分类页 URL 中，阅读页的返回链接会带回原来的列表状态。

默认将可阅读文章放在待补充和加载失败的条目前。阅读时间按中文约 350 字/分钟、英文约 220 词/分钟估算，不代表实测时间；没有正文的条目不显示阅读时间。桌面阅读页将目录置于侧栏，移动端默认折叠，目录高亮随当前章节更新。上一篇/下一篇按同栏目登记顺序生成。

# 论文树

在仓库根目录运行：

```powershell
python scripts/export-paper-tree.py --source D:\papers
```

它会递归导出目录结构，以及同名 `.md` 的讲解到 `assets/papers/`。网站直接读取这些静态 JSON；浏览器不会访问本地磁盘。更新论文库后重新运行，并随网站一起部署导出文件即可。

首次使用安装 PDF 文本读取依赖：`python -m pip install PyMuPDF`。同步时只读取 PDF 首页的 arXiv 编号，生成对应的 `/abs/` 原文链接；不把讲解或参考文献中引用的论文误当作原文。没有首页编号的论文，可将人工核对后的地址写入 `scripts/paper-links.json`，键为相对论文库根目录的路径（不含扩展名）。无法确认时页面显示“暂无已确认的 arXiv 链接”。

- PDF 只登记条目，不复制、上传或提供在线阅读；本地原文件不会被改动。
- 同一目录中同名的 PDF / Markdown 合并为一个条目；只有其中一种也会收录。
- 最后一个独占一行的 `---` 后的非空正文作为概述，前面作为详细讲解。忽略 YAML 元数据和代码块内的分隔符；无分隔段时仅提供详细讲解。该规则按约定拆分，不做语义判断。
- 忽略 `tmp`、`__pycache__`、隐藏文件、符号链接及 `AGENTS.md` / `CLAUDE.md`；保留空分类。
- 再次导出会移除已经撤下条目对应的旧 JSON 讲解，仅操作本工具先前登记的文件。
- 当前导出的是全部收录条目的讲解，部署前可在本地检查。页面没有嵌入原 PDF；Markdown 中的本地图片附件暂不导出。

用现有的静态服务打开 `/category.html?cat=papers`；主页的论文树预览使用同一份目录。

验证导出逻辑：`python -B -m unittest discover -s scripts -p "test_*.py"`

# 开源项目

```powershell
python scripts/export-projects.py
```

项目名单在 `scripts/projects.json`。脚本相对自身找到本仓库，再从本仓库的 `../<项目名>/README.md` 读取原文，导出到 `assets/projects/index.json`。目前只选取 `synthesis-osu-play` 和 `Markdown4Bilibili`，不读取其他项目或整个目录的内容，也不修改项目源文件。

首页预览、开源项目分类和项目阅读页共用这份导出内容。列表提供摘要、README 全文搜索、排序和分页，点击项目进入带侧栏目录的完整 README；GitHub 链接独立显示。更新 README 后重新执行命令，随网站部署 JSON 即可；换电脑只需保持项目与本站仓库为同级目录。项目缺失时命令报错，保留上一份导出。

GitHub 地址从项目的 origin 读取，README 中的相对文档链接指向对应 GitHub 文件，相对图片使用 raw 地址（默认分支来自 origin/HEAD，缺省为 main）；原文保留不变。本地尚未发布的图片或链接目标需要在对应项目发布后才能在线访问。
