# 留言服务

主页留言使用 `guestbook-config.js` 中的 Supabase 项目。它与秘密空间的 `secret-config.js` 独立配置。

首次初始化时，在新项目的 SQL Editor 中执行根目录 `guestbook-supabase-schema.sql` 全部内容。脚本创建留言表、开放访客读取公开留言和提交留言的权限，并启用行级权限；访客不能读取非公开留言，也不能修改或删除留言。站主可在 Supabase Table Editor 的 `guestbook_messages` 表中查看和管理所有留言。

`authProviders: ['github']` 显示 GitHub 登录入口，`emailAuth: true` 启用邮箱验证码登录。Google 暂不启用。匿名留言无需开启 Supabase Auth 的 Anonymous Sign-Ins。

1. 在 Supabase 的 Authentication → URL Configuration 中，将 Site URL 设为 `https://www.assassinlike.top/`。Redirect URLs 添加 `https://www.assassinlike.top/` 和本地测试地址 `http://localhost:8000/`、`http://127.0.0.1:8000/`；使用其他本地端口时也需登记对应地址。
2. 使用 `assass1nlike` 登录 GitHub，在 Settings → Developer settings → OAuth Apps → New OAuth App 创建应用。名称可用 `assassinlike Homepage`，Homepage URL 填 `https://www.assassinlike.top/`，Authorization callback URL 填 `https://myrhtqbjnkxqaniuivzm.supabase.co/auth/v1/callback`。将应用的 Client ID 和 Client Secret 填入 Supabase 的 Authentication → Sign In / Providers → GitHub，并启用、保存。
3. 在 Supabase 的 Authentication → Sign In / Providers 中启用 Email。邮箱登录使用 `signInWithOtp` 发送验证码、`verifyOtp` 验证并创建会话，不要求密码；首次验证成功会创建用户。

OAuth 的平台回调地址是 Supabase 的 `/auth/v1/callback`，不要填成主页地址；主页和 localhost 地址用于 Supabase 登录完成后的回跳。Client Secret 仅保存在对应平台和 Supabase 后台，不加入仓库。登录后取消“匿名显示”即可展示昵称和头像；邮箱用户可保存公开昵称，未设置时显示“已登录访客”，不会使用邮箱地址作为公开昵称。

邮箱发信使用自定义 SMTP，不能依赖 Supabase 自带发信服务向普通访客发送邮件。以 Resend 为例：

1. 在 Resend → Domains 添加 `auth.assassinlike.top`。按 Resend 显示的实际值，在阿里云 DNS 添加验证和发信所需记录；不修改主页 `www` 的 CNAME。域名验证成功后，以 `login@auth.assassinlike.top` 发信。
2. 在 Resend 创建具有 Sending access 权限的 API Key，并限定为上述域名。
3. 在 Supabase → Authentication → Emails → SMTP Settings 启用 Custom SMTP。Sender email 填 `login@auth.assassinlike.top`，Sender name 填 `assassinlike`，Host 填 `smtp.resend.com`，Port 填 `465`，Username 填 `resend`，Password 填 Resend API Key。密钥不放入前端或仓库。
4. 在 Emails 的 Magic Link 模板中展示 `{{ .Token }}`，不要只保留 `{{ .ConfirmationURL }}` 登录链接；Confirm signup 模板也展示 Token，以覆盖首次注册。邮件正文可用 `<p>你的登录验证码是：</p><p><strong>{{ .Token }}</strong></p><p>请返回网站输入验证码。若非本人操作，请忽略此邮件。</p>`。
5. 在本地页面发送验证码，验证新用户和再次登录、保存昵称、匿名选项与退出登录。实际发信测试使用自己的邮箱，不需要公开留言；未测试前不能认为 SMTP 或整个登录流程已验证成功。

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

学习、博客、其它使用同一个更新命令。在仓库根目录运行：

```powershell
python scripts/export-articles.py
```

| 栏目 | 发布目录（相对仓库根目录） |
| --- | --- |
| 学习 | `everlasting/invisible/notes/` |
| 博客 | `everlasting/invisible/minors/published/` |
| 其它 | `everlasting/invisible/tech/` |
| 博客中的年终总结 | `everlasting/invisible/annual/` |

写好后把 Markdown 和图片放入对应发布目录，可创建子文件夹，文件名不限（博客也可继续叫 `determined.md`）。文章首个 `# 一级标题` 用作列表标题；没有一级标题时使用文件名。标题提取跳过 YAML 元数据与代码块。图片使用相对路径，例如 `![说明](./images/figure.png)`，发布时连同图片一起提交。

新增、改名、删除文章或修改标题后运行命令，刷新本地页面即可检查。仅修改正文或图片时可直接刷新，重新运行脚本也无妨。预览可运行 `python -m http.server 8000`，打开 `http://localhost:8000/`。脚本生成 `assets/articles/catalog.js`，不修改文章、不暂存、不提交、不推送；正式发布时只提交准备公开的 Markdown、图片及生成的目录文件，再 push。首页预览、分类列表和阅读页共用此目录，无需再编辑 `script.js`。

发布目录中所有 Markdown 都会被收录；草稿请放在这些目录之外。脚本跳过 `.gitignore` 排除的文件、隐藏文件与目录、`tmp`、`__pycache__`、`node_modules`、符号链接／目录联接，以及 `AGENTS.md`、`CLAUDE.md`、`README.md`。不扫描 `research/` 或 `minors/` 下其它目录。未被目录收录不等于私密：已提交到公开仓库的文件仍可被直接访问。

特殊设置在 `scripts/articles.json`：`sources` 指定扫描目录，`overrides` 可指定显示标题、发布日期或旧链接别名。通常新增文章不需要修改该文件。学习、博客和其它按发布日期从晚到早排列，同日文章保留扫描顺序。`preliminaries.md` 显示“补一些非常basic的知识”，日期为 `2026-07-15`，现有阅读链接与年终总结筛选保留。

列表与阅读页显示首次发布日期 `publishedAt`，格式为 `YYYY-MM-DD`，按上海时区记录。已有文章用当前 Git 历史中该文件首次加入的日期补齐（跟随已提交的改名记录），不是文件修改时间或年终总结的年份；更早的实际发表日期如已无法从历史恢复，可在 `scripts/articles.json` 的 `overrides` 中为对应路径设置 `"publishedAt": "2023-12-31"`。新文章没有提交记录时，首次生成目录的当天作为默认发布日期，保存在生成目录中；预览与实际发布间隔较长时可用同样方式指定日期。以后修改正文或重新生成目录都会保留日期。提交时保留生成目录，换电脑后也不会重置。

页面只显示日期数字。现有三篇年终总结的日期指定为次年正月初二；12 篇导入学习笔记按原下载文件的日期、编号升序分配在 `2026-08-20` 至 `2026-09-10`，属于人工补定日期，已写入 `overrides`，不会被 Git 日期覆盖。

验证更新脚本：`python -B -m unittest discover -s scripts -p "test_export_articles.py"`。

博客、学习、其它和开源项目共用 `article-library.js` 和 `article-library.css`，从 Markdown 提取摘要、搜索正文。独立分类页每页 6 项，首页预览每页 3 项，只有一页时隐藏分页。年终总结属于博客列表，右侧排序下方、分隔线下的“只看子集：各年年终总结”可切换筛选。博客、学习、其它不显示主题和状态；子集、搜索、排序及页码保留在分类页 URL 中，阅读页的返回链接会带回原来的列表状态。“其它”沿用 `cat=tech` 和原文章目录。

文章默认按发布日期从晚到早显示；开源项目将可阅读内容放在待补充和加载失败的条目前。列表显示字数（中文字符数加英文单词数，排除公式与网址）。桌面阅读页将目录置于侧栏，移动端默认折叠，目录高亮随当前章节更新。上一篇/下一篇按同栏目目录顺序生成。

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

会议与期刊标签在导出目录后单独更新：

```powershell
python scripts/update-paper-publications.py
```

脚本按 arXiv 编号关联论文，使用 arXiv 的正式标题与第一作者核对 OpenReview 的已录用 venue 记录；有正式 DOI 时通过 Crossref 核对出版信息。Semantic Scholar 可提供 DOI 线索，可选环境变量 `SEMANTIC_SCHOLAR_API_KEY` 用于其 API 鉴权。不会按本地简称模糊配对，也不会把 arXiv/CoRR、投稿、拒稿或撤稿条目标为录用。OpenReview 主会与 Workshop 分开标注；Crossref 无法单凭类型区分主会与 Workshop，因此保留完整名称并标注“论文集”。

`scripts/paper-publications-cache.json` 保存查询结果，`assets/papers/publications.json` 是网站读取的静态数据。已确认条目默认跳过，未确认条目每隔七天可重查；失败的查询下次可重试。遇到 403/429 时停止向相应接口继续请求，本轮仍可使用其它来源。查询失败或未找到不会清空已有确认结果。`--refresh` 强制重查，`--limit 10` 限制本轮查询数量，`--offline` 仅应用缓存和人工更正。

人工更正在 `scripts/paper-publications.json` 中填写，以不带版本号的 arXiv 编号为键。格式示例（不是待录用状态）：

```json
{
  "2410.10762": {
    "label": "ICLR 2025 Oral",
    "kind": "conference",
    "url": "https://openreview.net/forum?id=z5uVAKwmjf"
  }
}
```

`kind` 支持 `conference`、`workshop`、`journal`、`proceedings`。`label` 写完整会议／期刊名称与年份，`url` 指向确认来源。把某个编号的值设为 `null` 可隐藏错误标签；人工设置优先于自动结果，`--refresh` 也不会覆盖它。编辑后运行 `python scripts/update-paper-publications.py --offline` 即可生效。改名或移动论文文件不影响已关联的信息。

没有可靠来源的论文不显示标签；这不代表未被录用。若同名同作者对应多个正式 OpenReview venue，需人工选择。跨来源论文改题或作者顺序变化也可能需要手动填写。

验证导出逻辑：`python -B -m unittest discover -s scripts -p "test_*.py"`

# 开源项目

```powershell
python scripts/export-projects.py
```

项目名单在 `scripts/projects.json`。脚本相对自身找到本仓库，再从本仓库的 `../<项目名>/README.md` 读取原文，导出到 `assets/projects/index.json`。目前只选取 `synthesis-osu-play` 和 `MarkdownBridge`，不读取其他项目或整个目录的内容，也不修改项目源文件。

开源项目和论文树不添加日期。

首页预览、开源项目分类和项目阅读页共用这份导出内容。列表提供摘要、README 全文搜索、排序和分页，点击项目进入带侧栏目录的完整 README；GitHub 链接独立显示。更新 README 后重新执行命令，随网站部署 JSON 即可；换电脑只需保持项目与本站仓库为同级目录。项目缺失时命令报错，保留上一份导出。

GitHub 地址从项目的 origin 读取，README 中的相对文档链接指向对应 GitHub 文件，相对图片使用 raw 地址（默认分支来自 origin/HEAD，缺省为 main）；原文保留不变。本地尚未发布的图片或链接目标需要在对应项目发布后才能在线访问。
