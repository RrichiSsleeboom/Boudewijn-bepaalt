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
  // Escape closes (when allowed). Tab stays inside the dialog for keyboard users.
  const onKey = e => {
    if (e.key === 'Escape' && closable) {
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = [...backdrop.querySelectorAll('button:not(:disabled), [href], input, select')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
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
