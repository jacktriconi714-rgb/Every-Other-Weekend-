/* Every Other Weekend: tiny page runtime + form sending */
class DCLogic {
  constructor() { this.props = {}; this.state = {}; }
  setState(o) { this.state = Object.assign({}, this.state, o); if (this._render) this._render(); }
}
var EOW_CONFIG = Object.assign({
  siteUrl: 'https://everyotherweekendco.netlify.app',
  reserved: 0,          // bottles reserved; counter hidden while 0
  batchTotal: null,     // set to a number to show a progress bar
  videos: [],           // [{ url, poster, title }] newest first; strip hidden while empty
  bottles: { original: false, grill: false, smoke: false } // true once img/bottle-<key>.webp exists
}, window.EOW_CONFIG_OVERRIDE || {});
var EOW_FORM_URL = 'https://formsubmit.co/ajax/everyotherweekendsauce@gmail.com';
function eowSend(subject, message, replyTo) {
  return fetch(EOW_FORM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ _subject: subject, _template: 'box', _replyto: replyTo, email: replyTo, message: message, _honey: '' })
  }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
    if (!r.ok || String(j.success) === 'false') { if (window.console) console.warn('Form service said:', j.message || r.status); throw new Error(j.message || 'send failed'); }
    return j;
  }); });
}
function eowMount(Component) {
  var c = new Component();
  var root = document.querySelector('[data-eow]');
  function vals() { return c.renderVals(); }
  function render() {
    var v = vals();
    root.querySelectorAll('[data-if]').forEach(function (el) { el.hidden = !v[el.getAttribute('data-if')]; });
    root.querySelectorAll('[data-t]').forEach(function (el) { var x = v[el.getAttribute('data-t')]; el.textContent = x == null ? '' : String(x); });
    root.querySelectorAll('[data-val]').forEach(function (el) { var x = v[el.getAttribute('data-val')]; x = x == null ? '' : String(x); if (el.value !== x) el.value = x; });
    root.querySelectorAll('[data-style]').forEach(function (el) { el.style.cssText = el.getAttribute('data-base') + '; ' + (v[el.getAttribute('data-style')] || ''); });
    root.querySelectorAll('[data-pressed]').forEach(function (el) { el.setAttribute('aria-pressed', v[el.getAttribute('data-pressed')]); });
    root.querySelectorAll('[data-fallback]').forEach(function (el) { el.hidden = !c.state.sendFailed; el.href = v.notifyHref || v.reqHref || v.orderHref || 'mailto:everyotherweekendsauce@gmail.com'; });
    root.querySelectorAll('[data-busy]').forEach(function (el) { el.disabled = !!c.state.sending; el.style.opacity = c.state.sending ? '0.6' : ''; });
  }
  c._render = render;
  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-click]'); if (!el) return;
    var fn = vals()[el.getAttribute('data-click')]; if (typeof fn === 'function') fn(e);
  });
  root.addEventListener('input', function (e) {
    var el = e.target.closest('[data-input]'); if (!el) return;
    var fn = vals()[el.getAttribute('data-input')]; if (typeof fn === 'function') fn({ target: el });
  });
  root.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    var form = e.target.closest('[data-form]'); var btn = form && form.querySelector('[data-busy]');
    if (btn) { e.preventDefault(); btn.click(); }
  });
  render();
  if (c.componentDidMount) c.componentDidMount();
}
