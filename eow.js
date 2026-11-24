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
  bottles: { original: false, grill: false, smoke: false }, // true once img/bottle-<key>.webp exists
  showPhotoSlots: null  // null = dashed 'photo goes here' boxes on previews only; true/false forces
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
var EOW_FLAVOR_NAMES = { original: 'The Original', grill: 'Grill Master', smoke: 'Smoke Alarm Special' };
// Dashed "photo goes here" boxes: shown on Netlify previews and local copies, never on the live site.
function eowShowPhotoSlots(host) {
  host = String(host || '');
  return /^(localhost|127\.0\.0\.1)$/.test(host) || /^deploy-preview-\d+--/.test(host);
}
// Shows config-gated content. Everything it touches starts hidden in the markup.
function eowApplyConfig(root) {
  var C = EOW_CONFIG;
  var reserved = Number(C.reserved) || 0, total = Number(C.batchTotal) || 0;
  root.querySelectorAll('[data-counter]').forEach(function (box) {
    box.hidden = !(reserved > 0);
    var t = box.querySelector('[data-counter-text]');
    if (t) t.textContent = reserved.toLocaleString('en-US') + ' bottles reserved from Batch 001';
    var bar = box.querySelector('[data-counter-bar]');
    if (bar) {
      bar.hidden = !(reserved > 0 && total > 0);
      if (total > 0) {
        bar.setAttribute('aria-valuenow', String(reserved));
        bar.setAttribute('aria-valuemax', String(total));
        var fill = bar.querySelector('[data-counter-fill]');
        if (fill) fill.style.width = Math.min(100, reserved / total * 100) + '%';
      }
    }
  });
  var strip = root.querySelector('[data-videos]');
  var videos = Array.isArray(C.videos) ? C.videos.filter(function (v) { return v && /^https:\/\//.test(String(v.url || '')); }) : [];
  if (strip) {
    var list = strip.querySelector('[data-video-list]');
    if (list && videos.length) {
      list.textContent = '';
      videos.forEach(function (v) {
        var a = document.createElement('a');
        a.className = 'video-card'; a.href = String(v.url); a.target = '_blank'; a.rel = 'noopener';
        var img = document.createElement('img');
        img.src = String(v.poster || ''); img.alt = String(v.title || 'Video'); img.loading = 'lazy'; img.width = 360; img.height = 640;
        var span = document.createElement('span');
        span.className = 'video-title'; span.textContent = String(v.title || '');
        a.appendChild(img); a.appendChild(span); list.appendChild(a);
      });
    }
    strip.hidden = !videos.length;
  }
  var bottles = C.bottles || {};
  root.querySelectorAll('img.bottle[data-bottle]').forEach(function (img) {
    var key = img.getAttribute('data-bottle');
    if (!bottles[key]) { img.hidden = true; return; }
    img.src = 'img/bottle-' + key + '.webp';
    img.alt = (EOW_FLAVOR_NAMES[key] || key) + ' bottle';
    img.hidden = false;
  });
  var slotsOn = C.showPhotoSlots == null ? eowShowPhotoSlots(window.location.hostname) : !!C.showPhotoSlots;
  root.querySelectorAll('[data-photo-slot]').forEach(function (el) { el.hidden = !slotsOn; });
  var sticky = root.querySelector('[data-sticky]');
  var heroEl = document.getElementById('top'), findEl = document.getElementById('find');
  if (sticky && heroEl && 'IntersectionObserver' in window && window.matchMedia) {
    var mq = window.matchMedia('(max-width: 720px)'), pastHero = false, atFind = false;
    var update = function () { sticky.hidden = !(mq.matches && pastHero && !atFind); };
    new IntersectionObserver(function (es) { es.forEach(function (e) { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; }); update(); }).observe(heroEl);
    if (findEl) new IntersectionObserver(function (es) { es.forEach(function (e) { atFind = e.isIntersecting || e.boundingClientRect.top < 0; }); update(); }).observe(findEl);
    if (mq.addEventListener) mq.addEventListener('change', update);
  }
}
// "Know someone who grills?" share, with a copy-link fallback.
function eowShare(btn) {
  var url = EOW_CONFIG.siteUrl;
  if (navigator.share) {
    navigator.share({ title: 'Every Other Weekend', text: 'Know someone who grills? Send them this.', url: url }).catch(function () {});
    return;
  }
  var done = function () { btn.textContent = 'Link copied'; };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { btn.textContent = url; });
  else btn.textContent = url;
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
    root.querySelectorAll('[data-fallback]').forEach(function (el) {
      var key = el.getAttribute('data-fallback'), forKey = el.getAttribute('data-for');
      el.hidden = forKey ? c.state.sendFailed !== forKey : !c.state.sendFailed;
      el.href = (key && v[key]) || v.notifyHref || v.reqHref || v.orderHref || 'mailto:everyotherweekendsauce@gmail.com';
    });
    root.querySelectorAll('[data-busy]').forEach(function (el) { el.disabled = !!c.state.sending; el.style.opacity = c.state.sending ? '0.6' : ''; });
  }
  c._render = render;
  root.addEventListener('click', function (e) {
    var sh = e.target.closest('[data-share]'); if (sh) { eowShare(sh); return; }
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
  eowApplyConfig(root);
  if (c.componentDidMount) c.componentDidMount();
}
