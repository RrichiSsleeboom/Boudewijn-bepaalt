// A simple modal dialog. close(true) closes silently; close() also runs onClose.
// Escape closes the modal (through close()) when closable is true.
export function openModal({ title, body, closable = true, onClose, labelledBy = 'modal-title' }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${labelledBy}">
      <h2 id="${labelledBy}">${title}</h2>
      <div class="modal-body"></div>
    </div>`;
  backdrop.querySelector('.modal-body').innerHTML = body;
  document.body.appendChild(backdrop);

  let closed = false;
  const close = (silent = false) => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    if (!silent) onClose?.();
  };
  const onKey = e => {
    if (e.key === 'Escape' && closable) close();
  };
  document.addEventListener('keydown', onKey);

  backdrop.querySelector('button:not(:disabled)')?.focus();
  return {
    el: backdrop,
    close,
    body: backdrop.querySelector('.modal-body'),
    setBody(html) {
      backdrop.querySelector('.modal-body').innerHTML = html;
      backdrop.querySelector('button:not(:disabled)')?.focus();
    },
  };
}
