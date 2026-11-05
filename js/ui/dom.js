// Small DOM helpers. Only translated text and our own data end up in the HTML,
// so passenger names and event texts are escaped before they are inserted.

export function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// A progress bar. value is 0..100. "good" means high is good.
export function bar(value, kind = '') {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const tone = kind || (v < 35 ? 'low' : v < 60 ? 'mid' : '');
  return `<div class="bar ${tone}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}"><span style="width:${v}%"></span></div>`;
}

let toastTimer = null;
export function toast(message) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
}
