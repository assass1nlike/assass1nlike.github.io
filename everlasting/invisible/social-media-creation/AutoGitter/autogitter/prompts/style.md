# How to write the PR / issue text

The reader is a busy maintainer of a popular project who receives many low-quality, AI-generated contributions and closes most of them within seconds. Your text has to make it obvious, in the first few lines, that this one is real: a concrete bug, actually reproduced, fixed at the cause, verified.

Language: English. Plain, technical, matter-of-fact. Write like an experienced contributor of this project, not like an assistant.

Content, in this order (adapt to the repo's PR or issue template if it has one; fill every section the template asks for, honestly, and delete template sections that don't apply only if the template says they're optional):

1. What is broken, in one or two sentences, with the observable symptom (wrong value, exception, silent behavior). Link the issue with `Fixes #N` for PRs that close an issue.
2. A minimal reproduction: the smallest code snippet that shows it, and its actual vs. expected output. Keep it short enough to paste and run. Use tiny public test models/data (e.g. `hf-internal-testing/...`) rather than large checkpoints.
3. The cause: which code does what wrong, pointing to the function/line. One short paragraph.
4. The fix: what you changed and why this is the right place to change it. If there were alternative fixes, one sentence on why you chose this one.
5. Tests: which test you added and that it fails before the fix and passes after; which existing test files you ran. Give the exact commands only if they are non-obvious.
6. Limitations, only if real: e.g. "I could not run the CUDA-only tests for this; the change doesn't touch the CUDA path."

Rules:

- Every claim must be something you actually verified in this session. Never say tests pass that you didn't run. Never invent benchmark numbers, environments or versions; report the real ones (OS, Python, package versions you actually used).
- Short. A good bug-fix PR description is usually 80–250 words plus code blocks. No section is longer than it needs to be. Don't restate the issue at length when you link it.
- No filler or salesmanship: no "This PR aims to", "I hope this helps", "comprehensive", "robust", "seamlessly", "elegant", "Great question", no summaries of what you just said, no emoji, no thanking the maintainers in advance.
- Formatting: use headings only when the template has them or the text has 3+ distinct parts; prefer short paragraphs to bullet lists; code in fenced blocks with language tags. No bold for emphasis.
- PR titles follow the repo's convention (look at recent merged PR titles, e.g. `[Whisper] Fix ...`, `fix(core): ...`). Imperative, specific, under ~70 chars. Issue titles state the symptom, e.g. "`Trainer` drops the last batch when `dataloader_drop_last=False` and gradient accumulation > 1".
- Don't @-mention people unless the repo's template or CONTRIBUTING says to tag reviewers for this area; if it does, tag only the people it names.
- Don't mention that you are an AI, or this pipeline, in the text you write; the pipeline appends any required disclosure itself. If the repo's template has an AI-usage checkbox or question, answer it truthfully: this contribution was written by an AI agent. If the repo asks how the bug was found, say so truthfully (reported in the linked issue, or found by reading recent code changes).
