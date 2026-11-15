/* Shared reading aids: enlarge a figure, and copy a link to the paragraph you selected. */
window.ReaderTools = (() => {
  let overlay = null;

  // Figures in prose are often wider than the column; open them at full size instead of zooming the page.
  function enlargeable(image) {
    return image.closest('.markdown-body, .paper-reader-body')
      && !image.closest('.library-reader-head, .profile-panel, .friend-sites, .guestbook, .brand');
  }

  function openOverlay(image) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'reader-lightbox';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('data-site-ui', '');
      overlay.innerHTML = '<button type="button" class="reader-lightbox-close" aria-label="关闭">×</button><figure><img alt=""><figcaption></figcaption></figure>';
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.closest('.reader-lightbox-close')) closeOverlay();
      });
      document.body.append(overlay);
    }
    const img = overlay.querySelector('img');
    const caption = overlay.querySelector('figcaption');
    const source = image.closest('figure')?.querySelector('figcaption');
    img.src = image.currentSrc || image.src;
    img.alt = image.alt || '';
    caption.textContent = source?.textContent?.trim() || '';
    caption.hidden = !caption.textContent;
    overlay.classList.add('is-open');
    document.body.classList.add('reader-lightbox-open');
    overlay.querySelector('.reader-lightbox-close').focus({ preventScroll: true });
  }

  function closeOverlay() {
    overlay?.classList.remove('is-open');
    document.body.classList.remove('reader-lightbox-open');
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay?.classList.contains('is-open')) closeOverlay();
  });

  // The DOM is re-rendered often, so listen once on the document rather than per image.
  document.addEventListener('click', (event) => {
    const image = event.target.closest('img');
    if (image && enlargeable(image)) {
      event.preventDefault();
      openOverlay(image);
    }
  });

  return { closeOverlay };
})();
