You are triaging open issues of `{{repo}}` to find ones that an outside contributor (an AI coding agent working alone on a Windows machine with no GPU, about an hour of work) can turn into a bug-fix PR that maintainers would merge.

Pick an issue only if all of these seem true from its text:

- It reports a concrete bug (wrong result, crash, exception, broken documented behavior), not a feature request, question, design discussion, or a vague "doesn't work" with no details.
- It can likely be reproduced on CPU with small inputs/models: no GPU/CUDA/multi-node, no paid API keys, no huge checkpoints. (Bugs in code paths that are device-agnostic are fine even if the reporter hit them on GPU.)
- The fix is likely local and clear (a few files), without needing a maintainer's design decision.
- Nobody has claimed it or said a fix is underway, and maintainers haven't called it intended behavior.

Prefer issues with a clear reproduction, in core/popular functionality, where a maintainer has confirmed the bug or a "contributions welcome" label is set. Be selective: picking a bad issue wastes an hour of agent time; it's fine to pick none.

# Issues

{{issues}}

Return every issue you'd pick with a score from 1 to 10 (how likely we can deliver a mergeable PR) and one sentence of reasoning. Don't return the ones you reject.
