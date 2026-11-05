# 知乎回答下载

使用 [Zhihu-Scraper](https://github.com/yuchenzhu-research/zhihu-scraper)，安装在本目录的 `zhihu-scraper/`，使用独立的 `.venv` 环境。

在 `tools` 目录打开 PowerShell，下载指定回答：

```powershell
cd .\usage\zhihu-scraper
.\.venv\Scripts\zhihu.exe fetch "https://www.zhihu.com/question/问题ID/answer/回答ID"
```

结果保存在 `zhihu-scraper/知乎归档/标题/`，包含 Markdown 和本地图片；公式保留为 LaTeX。链接应包含 `/answer/回答ID`，仅提供问题链接会下载该问题下的多个回答。

如果需要登录，在同一目录执行：

```powershell
.\.venv\Scripts\zhihu.exe login
.\.venv\Scripts\zhihu.exe check -s .local/login.toml
.\.venv\Scripts\zhihu.exe fetch -s .local/login.toml "回答链接"
```

`login` 会打开浏览器，手动完成知乎登录后保存会话；`.local/login.toml` 已配置好对应的 Cookie 文件路径。

需要指定保存位置时，给 `fetch` 加上 `-o "保存目录"`；加上 `--html` 可同时生成离线网页。
