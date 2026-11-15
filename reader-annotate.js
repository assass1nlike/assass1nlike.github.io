/* Inline annotations: select text, leave a note. Highlights are rebuilt from a quote + context. */
window.ReaderAnnotate = (() => {
  const CONTEXT = 40;
  const SELECTION_KEY = 'assassinlike.annotation.pending';
  const PROVIDER_LABELS = { github: 'GitHub 登录', google: 'Google 登录', discord: 'Discord 登录', azure: 'Microsoft 登录' };
  const state = { host: null, key: '', annotations: [], user: null, popover: null, hintBar: null };

  function textNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('script, style, pre code, .reader-annotation-mark, .reader-annotation-pop')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  // Character offsets over the rendered text, mapped back to the text nodes they came from.
  function index(root) {
    const nodes = textNodes(root);
    const starts = [];
    let text = '';
    for (const node of nodes) {
      starts.push(text.length);
      text += node.nodeValue;
    }
    return { nodes, starts, text };
  }

  function nodeAt(map, offset) {
    let low = 0;
    let high = map.starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (map.starts[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return low;
  }

  function selectionAnchor() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    if (!state.host.contains(range.commonAncestorContainer)) return null;
    const map = index(state.host);
    // The range start may sit in an element node; take the first text node inside it.
    const anchorNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer : document.createTreeWalker(range.startContainer, NodeFilter.SHOW_TEXT).nextNode();
    if (!anchorNode || !map.nodes.includes(anchorNode)) return null;
    const base = map.starts[map.nodes.indexOf(anchorNode)];
    const start = base + range.startOffset;
    const end = start + selection.toString().length;
    const quote = map.text.slice(start, end);
    if (!quote.trim() || quote.length > 400) return null;
    return {
      quote,
      prefix: map.text.slice(Math.max(0, start - CONTEXT), start),
      suffix: map.text.slice(end, end + CONTEXT),
      rect: range.getBoundingClientRect(),
    };
  }

  // Find the quote near where its context says it should be; fall back to the first occurrence.
  function locate(map, annotation) {
    const { quote, prefix, suffix } = annotation;
    const candidates = [];
    let from = 0;
    while (true) {
      const at = map.text.indexOf(quote, from);
      if (at === -1) break;
      candidates.push(at);
      from = at + 1;
    }
    if (!candidates.length) return null;
    return candidates.sort((a, b) => score(b) - score(a))[0];

    function score(at) {
      const before = map.text.slice(Math.max(0, at - prefix.length), at);
      const after = map.text.slice(at + quote.length, at + quote.length + suffix.length);
      return (before === prefix ? 2 : before.endsWith(prefix.slice(-10)) ? 1 : 0)
        + (after === suffix ? 2 : after.startsWith(suffix.slice(0, 10)) ? 1 : 0);
    }
  }

  function wrap(map, annotation) {
    const at = locate(map, annotation);
    if (at === null) return false;
    const end = at + annotation.quote.length;
    const first = nodeAt(map, at);
    const last = nodeAt(map, end - 1);
    const range = document.createRange();
    range.setStart(map.nodes[first], at - map.starts[first]);
    range.setEnd(map.nodes[last], end - map.starts[last]);
    const mark = document.createElement('mark');
    mark.className = 'reader-annotation-mark';
    mark.dataset.annotation = annotation.id;
    mark.title = annotation.body.slice(0, 120);
    try {
      range.surroundContents(mark);
      return true;
    } catch {
      // surroundContents refuses ranges that cross element boundaries; keep the text, skip the highlight.
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function closePopover() {
    state.popover?.remove();
    state.popover = null;
  }

  function showAnnotation(annotation, rect) {
    closePopover();
    const pop = document.createElement('div');
    pop.className = 'reader-annotation-pop';
    pop.setAttribute('role', 'dialog');
    pop.innerHTML = `
      <div class="reader-annotation-quote">${escapeHtml(annotation.quote.slice(0, 160))}</div>
      <div class="reader-annotation-body">${escapeHtml(annotation.body)}</div>
      <div class="reader-annotation-meta">${escapeHtml(annotation.author_name || '已登录访客')} · ${escapeHtml((annotation.created_at || '').slice(0, 10))}</div>`;
    if (state.user && state.user.id === annotation.auth_user_id) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'reader-annotation-remove';
      remove.textContent = '删除';
      remove.addEventListener('click', async () => {
        if (!(await window.ReaderData.removeAnnotation(annotation.id))) return;
        state.annotations = state.annotations.filter((item) => item.id !== annotation.id);
        closePopover();
        render();
      });
      pop.append(remove);
    }
    document.body.append(pop);
    const top = rect.bottom + window.scrollY + 8;
    const left = Math.min(Math.max(12, rect.left + window.scrollX), window.innerWidth - 340);
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    state.popover = pop;
  }

  function composer(anchor) {
    closePopover();
    const pop = document.createElement('div');
    pop.className = 'reader-annotation-pop is-composer';
    pop.innerHTML = `
      <div class="reader-annotation-quote">${escapeHtml(anchor.quote.slice(0, 160))}</div>
      <textarea maxlength="1000" rows="3" placeholder="写下你的批注（Ctrl + Enter 发送）"></textarea>
      <div class="reader-annotation-actions">
        <span class="reader-annotation-hint"></span>
        <button type="button" class="reader-annotation-send">发送</button>
        <button type="button" class="reader-annotation-cancel">取消</button>
      </div>`;
    document.body.append(pop);
    const top = anchor.rect.bottom + window.scrollY + 8;
    const left = Math.min(Math.max(12, anchor.rect.left + window.scrollX), window.innerWidth - 340);
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
    const box = pop.querySelector('textarea');
    const hint = pop.querySelector('.reader-annotation-hint');
    box.focus();
    pop.querySelector('.reader-annotation-cancel').addEventListener('click', closePopover);
    pop.querySelector('.reader-annotation-send').addEventListener('click', async () => {
      const body = box.value.trim();
      if (!body) { hint.textContent = '内容不能为空。'; return; }
      hint.textContent = '正在保存…';
      try {
        const saved = await window.ReaderData.addAnnotation(state.key, anchor, body);
        state.annotations.push(saved);
        closePopover();
        render();
        hint.textContent = '';
      } catch (error) {
        hint.textContent = error.message;
      }
    });
    box.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) pop.querySelector('.reader-annotation-send').click();
      if (event.key === 'Escape') closePopover();
    });
    state.popover = pop;
  }

  function render() {
    state.host.querySelectorAll('.reader-annotation-mark').forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    state.host.normalize();
    // Each wrap inserts an element, so the offsets are only valid until the next one.
    for (const annotation of state.annotations) wrap(index(state.host), annotation);
    const count = document.querySelector('.reader-annotation-count');
    if (count) count.textContent = state.annotations.length ? `${state.annotations.length} 条批注` : '暂无批注';
    state.host.querySelectorAll('.reader-annotation-mark').forEach((mark) => {
      mark.addEventListener('click', (event) => {
        event.stopPropagation();
        const annotation = state.annotations.find((item) => item.id === mark.dataset.annotation);
        if (annotation) showAnnotation(annotation, mark.getBoundingClientRect());
      });
    });
  }

  function selectionBar() {
    const anchor = selectionAnchor();
    closeHint();
    if (!anchor) return;
    const bar = document.createElement('div');
    bar.className = 'reader-annotation-hint-bar';
    if (state.user) {
      bar.innerHTML = '<button type="button" data-annotate>批注这段</button>';
    } else {
      const { providers, email } = window.ReaderData.authProviders();
      const options = providers.map((provider) =>
        `<button type="button" data-provider="${provider}">${PROVIDER_LABELS[provider] || provider}</button>`).join('')
        + (email ? '<button type="button" data-email-signin>邮箱</button>' : '');
      bar.classList.add('is-signin');
      // Short enough to stay on one line; the buttons are the login entry themselves.
      bar.innerHTML = `<span class="reader-annotation-hint-copy">登录后可批注</span>${options}`;
    }
    document.body.append(bar);
    const top = anchor.rect.top + window.scrollY - 44;
    bar.style.top = `${Math.max(8, top)}px`;
    // Keep the whole bar on screen no matter how many sign-in buttons it carries.
    const width = bar.offsetWidth;
    bar.style.left = `${Math.max(8, Math.min(anchor.rect.left + window.scrollX, window.innerWidth - width - 12))}px`;
    bar.querySelector('[data-annotate]')?.addEventListener('click', () => {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      composer(anchor);
    });
    bar.querySelector('[data-email-signin]')?.addEventListener('click', () => signInByEmail(anchor));
    bar.querySelectorAll('[data-provider]').forEach((button) => {
      button.addEventListener('click', async () => {
        // Keep the selection so the reader does not have to find the passage again after signing in.
        rememberSelection(anchor);
        try {
          await window.ReaderData.signIn(button.dataset.provider);
        } catch (error) {
          button.textContent = error.message || '登录失败';
        }
      });
    });
    state.hintBar = bar;
  }

  // Email sign-in needs the address before the page can leave, so ask for it here.
  function signInByEmail(anchor) {
    closeHint();
    const pop = document.createElement('div');
    pop.className = 'reader-annotation-pop is-composer';
    pop.innerHTML = `
      <div class="reader-annotation-quote">用邮箱登录后即可批注</div>
      <input class="reader-annotation-email" type="email" inputmode="email" placeholder="你的邮箱" autocomplete="email">
      <div class="reader-annotation-actions">
        <span class="reader-annotation-hint"></span>
        <button type="button" class="reader-annotation-send">发送验证码</button>
        <button type="button" class="reader-annotation-cancel">取消</button>
      </div>`;
    document.body.append(pop);
    const top = anchor.rect.bottom + window.scrollY + 8;
    pop.style.top = `${top}px`;
    pop.style.left = `${Math.max(12, Math.min(anchor.rect.left + window.scrollX, window.innerWidth - 340))}px`;
    const box = pop.querySelector('input');
    const hint = pop.querySelector('.reader-annotation-hint');
    box.focus();
    pop.querySelector('.reader-annotation-cancel').addEventListener('click', closePopover);
    pop.querySelector('.reader-annotation-send').addEventListener('click', async () => {
      const email = box.value.trim();
      if (!email) { hint.textContent = '请填写邮箱。'; return; }
      hint.textContent = '正在发送…';
      try {
        rememberSelection(anchor);
        await window.ReaderData.signInWithEmail(email);
        hint.textContent = '验证码已发送，请查收邮件。';
        box.value = '';
        box.placeholder = '邮件里的验证码';
        pop.querySelector('.reader-annotation-send').textContent = '验证并登录';
        pop.querySelector('.reader-annotation-send').onclick = async () => {
          const token = box.value.trim();
          if (!token) { hint.textContent = '请填写验证码。'; return; }
          hint.textContent = '正在验证…';
          try {
            await window.ReaderData.verifyEmailCode(email, token);
            closePopover();
            await enable(state.host, state.key);
          } catch (error) {
            hint.textContent = error.message || '验证失败。';
          }
        };
      } catch (error) {
        hint.textContent = error.message || '发送失败。';
      }
    });
    state.popover = pop;
  }

  // The sign-in round trip reloads the page, so the selection is kept where a reload can see it.
  function rememberSelection(anchor) {
    try {
      sessionStorage.setItem(SELECTION_KEY, JSON.stringify({ key: state.key, quote: anchor.quote, prefix: anchor.prefix, suffix: anchor.suffix }));
    } catch { /* Without storage the reader can just select the passage again. */ }
  }

  function resumeSelection() {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(SELECTION_KEY) || 'null');
    } catch { /* Ignore a corrupt entry. */ }
    try { sessionStorage.removeItem(SELECTION_KEY); } catch { /* Nothing to clean up. */ }
    if (!saved || saved.key !== state.key || !state.user) return;
    const annotation = { ...saved, id: '__pending__', body: '' };
    // Highlight the remembered passage so the reader can see it is still there.
    if (wrap(index(state.host), annotation)) {
      const mark = state.host.querySelector('.reader-annotation-mark[data-annotation="__pending__"]');
      mark?.removeAttribute('data-annotation');
      mark?.classList.add('is-pending');
      mark?.addEventListener('click', () => composer({ ...saved, rect: mark.getBoundingClientRect() }), { once: true });
      mark?.scrollIntoView({ block: 'center' });
    }
  }

  function closeHint() {
    state.hintBar?.remove();
    state.hintBar = null;
  }

  async function enable(host, key) {
    state.host = host;
    state.key = key;
    const [annotations, user] = await Promise.all([
      window.ReaderData.loadAnnotations(key),
      window.ReaderData.currentUser(),
    ]);
    state.annotations = annotations;
    state.user = user;
    render();
    // Back from a sign-in: the reader already picked a passage, so reopen the note box on it.
    resumeSelection();
  }

  function init(host, key) {
    state.host = host;
    state.key = key;
    document.addEventListener('mouseup', (event) => {
      if (!state.host?.isConnected) return;
      if (event.target.closest?.('.reader-annotation-pop, .reader-annotation-hint-bar')) return;
      // Let the browser finish the selection before reading it.
      setTimeout(() => {
        if (window.getSelection()?.isCollapsed) { closeHint(); return; }
        selectionBar();
      }, 10);
    });
    document.addEventListener('click', (event) => {
      if (event.target.closest?.('.reader-annotation-pop, .reader-annotation-hint-bar, .reader-annotation-mark')) return;
      closePopover();
      closeHint();
    });
    enable(host, key);
  }

  return { init, enable, render };
})();
