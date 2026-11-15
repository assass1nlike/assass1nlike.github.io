/* Inline annotations: select text, leave a note. Highlights are rebuilt from a quote + context. */
window.ReaderAnnotate = (() => {
  const CONTEXT = 40;
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
    bar.innerHTML = state.user
      ? '<button type="button">批注这段</button>'
      : '<span>登录后可批注</span>';
    document.body.append(bar);
    const top = anchor.rect.top + window.scrollY - 44;
    bar.style.top = `${Math.max(8, top)}px`;
    bar.style.left = `${Math.min(Math.max(12, anchor.rect.left + window.scrollX), window.innerWidth - 160)}px`;
    bar.querySelector('button')?.addEventListener('click', () => {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      composer(anchor);
    });
    state.hintBar = bar;
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
