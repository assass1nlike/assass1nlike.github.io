# FangcunCyber：CyberGym Level 1 成功率 91.3%

2026.08 · 方寸跃迁

FangcunCyber 是方寸跃迁内部开发的漏洞复现 agent，以 DeepSeek V4 Flash 为底座模型，通过假设驱动的多智能体调查把漏洞报告变成可复现的 PoC。

CyberGym 是一个基于执行的基准，包含 OSS-Fuzz 在 188 个开源项目中发现的 1507 个真实漏洞。Level 1 的任务是给 agent 一段漏洞描述和修复前的代码库，让它产出一个能触发崩溃的输入。PoC 必须在漏洞版本上让 sanitizer 报错，同时在修复后的版本上不崩溃，由 benchmark 服务端独立做前后差分验证，所以光是"能崩"并不算数。

FangcunCyber 在全部 1507 个任务上复现了 1376 个，成功率 91.3%。在 Binary Only 设置下排名第 1，在所有公开结果中并列第 5。评测时关闭了本地 fuzzing 和本地调试，agent 既不能自己跑二进制，也不能挂调试器，只能靠读代码、推格式、用评测接口反馈的漏洞侧信息逐步收敛。

[GitHub 仓库](https://github.com/Fangcun-AI/FangcunCyber) · [X 上的发布说明](https://x.com/FangcunLeap/status/2095532240889614559)
