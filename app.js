'use strict';
const $ = id => document.getElementById(id);
const LOW = 20, TURB_MAX = 40, PH_MIN = 6.5, PH_MAX = 8.0;
const NAVY = '#1b2a5e';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* =====================================================================
   ÂM THANH (WebAudio tự tổng hợp – không cần file) + bật/tắt
   ===================================================================== */
const Snd = (() => {
  let ctx = null, master = null, noise = null, pump = null, timer = 0;
  let on = true, want = false, unlocked = false;
  try { on = localStorage.getItem('aq_sound') !== '0'; } catch (e) {}

  function ui() {
    const b = $('sound');
    b.classList.toggle('muted', !on);
    b.setAttribute('aria-pressed', String(on));
    $('soundTxt').textContent = 'Âm thanh: ' + (on ? 'Bật' : 'Tắt');
  }
  function get() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = on ? .9 : 0;
    master.connect(ctx.destination);
    const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + .03 * w) / 1.03; d[i] = last * 3.2; }
    noise = buf;
    return ctx;
  }
  function unlock() {
    unlocked = true;
    const c = get();
    if (c && c.state === 'suspended') c.resume();
    sync();
  }
  // tiếng "bủm" của bọt nước
  function bloop(f = 600, vol = .18, dur = .09) {
    if (!on || !unlocked) return;
    const c = get(); if (!c) return;
    const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 2.2, t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur + .04);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + .06);
  }
  function pop() {
    bloop(420 + Math.random() * 200, .2, .08);
    setTimeout(() => bloop(700 + Math.random() * 300, .14, .07), 70);
  }
  // tiếng bơm: tiếng động cơ ù ù + nước chảy ào ào + bọt nước lục bục
  function startPump() {
    if (pump || !on || !unlocked) return;
    const c = get(); if (!c) return;
    const t = c.currentTime, nodes = [];
    const out = c.createGain();
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(1, t + .5);
    out.connect(master);
    const src = c.createBufferSource(); src.buffer = noise; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = .9;
    const fg = c.createGain(); fg.gain.value = .35;
    src.connect(bp); bp.connect(fg); fg.connect(out);
    const lfo = c.createOscillator(); lfo.frequency.value = .8;
    const lg = c.createGain(); lg.gain.value = 350; lfo.connect(lg); lg.connect(bp.frequency);
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 5.5;
    const lg2 = c.createGain(); lg2.gain.value = .12; lfo2.connect(lg2); lg2.connect(fg.gain);
    const m = c.createOscillator(); m.type = 'sawtooth'; m.frequency.value = 58;
    const mf = c.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 260;
    const mg = c.createGain(); mg.gain.value = .1;
    m.connect(mf); mf.connect(mg); mg.connect(out);
    const vib = c.createOscillator(); vib.frequency.value = 7;
    const vg = c.createGain(); vg.gain.value = 1.6; vib.connect(vg); vg.connect(m.frequency);
    nodes.push(src, lfo, lfo2, m, vib);
    nodes.forEach(n => n.start(t));
    pump = { out, nodes };
    (function drip() {
      if (!pump) return;
      bloop(500 + Math.random() * 900, .09, .05 + Math.random() * .06);
      timer = setTimeout(drip, 110 + Math.random() * 260);
    })();
  }
  function stopPump() {
    if (!pump) return;
    const p = pump; pump = null; clearTimeout(timer);
    const t = ctx.currentTime;
    p.out.gain.cancelScheduledValues(t);
    p.out.gain.setValueAtTime(p.out.gain.value, t);
    p.out.gain.linearRampToValueAtTime(0, t + .4);
    setTimeout(() => { p.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); p.out.disconnect(); }, 500);
  }
  function sync() { if (on && want && unlocked) startPump(); else stopPump(); }
  function setPump(flag) {
    if (flag === want) return;
    want = flag;
    if (flag) { bloop(300, .22, .12); setTimeout(() => bloop(480, .18, .1), 110); }
    sync();
  }
  function toggle() {
    on = !on;
    try { localStorage.setItem('aq_sound', on ? '1' : '0'); } catch (e) {}
    ui();
    unlock();
    if (ctx) master.gain.setTargetAtTime(on ? .9 : 0, ctx.currentTime, .05);
    if (on) pop();
    sync();
  }
  // còi cảnh báo: 6 tiếng bíp cao-thấp (không phụ thuộc nút bật/tắt âm thanh nền)
  function siren() {
    if (!unlocked) return false;
    const c = get(); if (!c) return false;
    if (c.state === 'suspended') c.resume();
    const t0 = c.currentTime;
    for (let i = 0; i < 6; i++) {
      const o = c.createOscillator(), g = c.createGain(), s = t0 + i * .22;
      o.type = 'square';
      o.frequency.value = i % 2 ? 660 : 990;
      g.gain.setValueAtTime(.0001, s);
      g.gain.exponentialRampToValueAtTime(.22, s + .02);
      g.gain.exponentialRampToValueAtTime(.0001, s + .2);
      o.connect(g); g.connect(c.destination);
      o.start(s); o.stop(s + .22);
    }
    return true;
  }
  ui();
  return { unlock, pop, bloop, setPump, toggle, siren, isUnlocked: () => unlocked };
})();
$('sound').onclick = () => Snd.toggle();

/* =====================================================================
   CẢNH BÁO: khi vào web mà đang có cảnh báo (hoặc có cảnh báo mới)
   -> hiện hộp thông báo + kêu còi + rung + thông báo hệ thống
   ===================================================================== */
const Alarm = (() => {
  const modal = $('alarmModal'), BASE = document.title;
  let known = new Set(), acked = false, active = [], timer = 0, lastHtml = '';

  function beep() {
    if (!active.length || acked) return;
    if (Snd.siren()) { try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) {} }
  }
  function notify(list) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification('⚠ Bể cá có cảnh báo', { body: list.map(a => a[1]).join('\n'), tag: 'aqua-alert' }); } catch (e) {}
  }
  function draw() {
    const html = active.map(a => `<li><span class="t-ico">${a[0]}</span><div><b>${a[1]}</b><p>${a[2]}</p></div></li>`).join('');
    if (html !== lastHtml) { $('alarmList').innerHTML = html; lastHtml = html; }
  }
  function update(alerts) {
    active = alerts;
    if (!alerts.length) {                       // hết cảnh báo -> dọn dẹp
      modal.hidden = true; acked = false; known = new Set(); lastHtml = '';
      clearInterval(timer); timer = 0; document.title = BASE;
      return;
    }
    const keys = new Set(alerts.map(a => a[4]));
    const fresh = alerts.filter(a => !known.has(a[4]));
    known = keys;                                // cảnh báo đã hết rồi quay lại sẽ báo lại
    document.title = '⚠ CẢNH BÁO – ' + BASE;
    draw();
    if (fresh.length) {                          // có cảnh báo mới (hoặc vừa vào web)
      acked = false; modal.hidden = false;
      notify(fresh); beep();
      if (!timer) timer = setInterval(beep, 7000);  // còn cảnh báo thì cứ 7 giây kêu lại
    }
  }
  function ack() { acked = true; modal.hidden = true; }
  // lần chạm đầu tiên: trình duyệt cho phép phát tiếng -> kêu ngay nếu đang có cảnh báo
  function kick(target) {
    if (target && target.closest && target.closest('#alarmModal')) return;
    beep();
  }
  function askPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch (e) {}
    }
  }
  $('alarmOk').onclick = ack;
  return { update, kick, askPermission };
})();

/* =====================================================================
   HIỆU ỨNG BÓNG NƯỚC KHI BẤM
   ===================================================================== */
function waterBurst(x, y, n = 8) {
  if (REDUCED) return;
  const fx = $('fx');
  const ring = document.createElement('i');
  ring.className = 'ring'; ring.style.left = x + 'px'; ring.style.top = y + 'px';
  fx.appendChild(ring); setTimeout(() => ring.remove(), 800);
  for (let i = 0; i < n; i++) {
    const b = document.createElement('i'), s = rand(6, 18), t = rand(.8, 1.5);
    b.className = 'fb';
    b.style.cssText = `left:${x + rand(-22, 22)}px;top:${y + rand(-6, 10)}px;width:${s}px;height:${s}px;--dx:${rand(-30, 30)}px;--dy:${-rand(50, 120)}px;--t:${t}s`;
    fx.appendChild(b); setTimeout(() => b.remove(), t * 1000 + 100);
  }
}
function ripple(el, x, y) {
  if (REDUCED || !el.matches('.btn,.chip,.tabs button')) return;
  const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.4;
  const s = document.createElement('span');
  s.className = 'rip';
  s.style.cssText = `width:${d}px;height:${d}px;left:${x - r.left - d / 2}px;top:${y - r.top - d / 2}px`;
  el.appendChild(s); setTimeout(() => s.remove(), 700);
}
function jelly(el) {
  if (REDUCED || !el.matches('.btn,.chip,.tabs button')) return;
  el.classList.remove('jelly'); void el.offsetWidth; el.classList.add('jelly');
  setTimeout(() => el.classList.remove('jelly'), 520);
}
const HIT = 'button,.btn,.chip,input[type=range],.tank';
document.addEventListener('pointerdown', e => {
  const first = !Snd.isUnlocked();
  Snd.unlock();
  if (first) { Alarm.kick(e.target); Alarm.askPermission(); }
  const t = e.target.closest(HIT);
  if (!t) return;
  waterBurst(e.clientX, e.clientY, t.matches('.tank') ? 6 : 8);
  ripple(t, e.clientX, e.clientY); jelly(t);
  Snd.pop();
});
document.addEventListener('click', e => { // bấm bằng bàn phím (Enter/Space)
  if (e.detail !== 0) return;
  const t = e.target.closest('button,.btn,.chip'); if (!t) return;
  const r = t.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  Snd.unlock(); waterBurst(x, y); ripple(t, x, y); jelly(t); Snd.pop();
});

/* =====================================================================
   CÁ (bơi qua – bơi lại) + TRANG TRÍ DƯỚI NƯỚC
   ===================================================================== */
const FISH_TYPES = [
  { body: '#3ec3f7', belly: '#b4ecff', fin: '#ffd23f' },                 // Glubbo
  { body: '#ffa53a', belly: '#ffd9a0', fin: '#ffd23f' },                 // cá vàng
  { body: '#ff7aa8', belly: '#ffc7da', fin: '#a58bff' },
  { body: '#3ed6b0', belly: '#b9f5e4', fin: '#ffd23f' },
  { body: '#ff7b3d', belly: '#ffb88f', fin: '#ff7b3d', stripe: '#fff' },  // cá hề
  { body: '#ffd23f', belly: '#fff0a8', fin: '#3ec3f7' },
];
function fishSVG(t) {
  const o = `stroke="${NAVY}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const stripes = t.stripe ? `<path d="M44 9Q38 32 44 55" fill="none" stroke="${NAVY}" stroke-width="10"/><path d="M44 9Q38 32 44 55" fill="none" stroke="${t.stripe}" stroke-width="5"/><path d="M68 10Q64 32 68 54" fill="none" stroke="${NAVY}" stroke-width="9"/><path d="M68 10Q64 32 68 54" fill="none" stroke="${t.stripe}" stroke-width="4"/>` : '';
  return `<svg viewBox="-4 -4 108 68"><g class="tail"><path d="M26 30L4 10Q-2 30 4 50z" fill="${t.fin}" ${o}/></g>
<path d="M40 11Q56 -3 74 12z" fill="${t.fin}" ${o}/>
<ellipse cx="56" cy="32" rx="38" ry="25" fill="${t.body}" ${o}/>
<path d="M24 36Q56 58 90 38Q80 54 56 56Q32 56 24 36z" fill="${t.belly}"/>${stripes}
<g class="pfin"><path d="M52 34Q42 47 55 49Q61 42 52 34z" fill="${t.fin}" ${o} stroke-width="2.5"/></g>
<circle cx="78" cy="26" r="8" fill="#fff" ${o}/><circle cx="80" cy="26" r="4.2" fill="${NAVY}"/><circle cx="81.6" cy="24.4" r="1.6" fill="#fff"/>
<ellipse cx="72" cy="39" rx="4" ry="2.6" fill="#ff8fa3" opacity=".75"/>
<path d="M84 38Q89 41 93 36" fill="none" stroke="${NAVY}" stroke-width="2.8" stroke-linecap="round"/></svg>`;
}

const O = `stroke="${NAVY}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const castleSVG = () => `<svg class="d-castle" viewBox="0 0 120 110"><g ${O}>
<path fill="#f3c26a" d="M8 106V50h5v-7h6v7h6v-7h6v7h7v56z"/><path fill="#f3c26a" d="M82 106V50h7v-7h6v7h6v-7h6v7h5v56z"/>
<path fill="#f8d68a" d="M34 106V32h6v-8h7v8h7v-8h7v8h7v-8h7v8h11v74z"/><path fill="#7a4a1d" d="M52 106V88q8-12 16 0v18z"/>
<path fill="none" d="M60 24V4"/><path fill="#ff6b6b" d="M60 4l20 6-20 6z"/>
<circle cx="22" cy="68" r="4" fill="#7a4a1d"/><circle cx="97" cy="68" r="4" fill="#7a4a1d"/><circle cx="60" cy="52" r="5" fill="#7a4a1d"/></g></svg>`;
const wreckSVG = () => `<svg class="d-wreck" viewBox="0 0 170 120"><g ${O}>
<path fill="none" d="M90 64L102 6"/><path fill="#fff1cf" d="M102 10L148 44L130 46L136 58L98 48z"/>
<path fill="#b9793a" d="M10 66L156 52Q154 98 118 112L50 114Q16 104 10 66z"/>
<path fill="none" stroke-width="2.5" d="M22 82H148M34 96H136"/>
<path fill="#8a5a2b" d="M10 66L156 52L158 63L12 77z"/>
<circle cx="52" cy="80" r="8" fill="#9fe3f5"/><circle cx="88" cy="77" r="8" fill="#9fe3f5"/><circle cx="124" cy="74" r="8" fill="#9fe3f5"/></g></svg>`;
const coralSVG = (cls, a, b) => `<svg class="d-coral ${cls}" viewBox="0 0 100 90"><g ${O}>
<path fill="${a}" d="M14 88V46q0-12 9-12t9 12v42z"/><path fill="${a}" d="M36 88V22q0-14 11-14t11 14v66z"/>
<path fill="${a}" d="M62 88V40q0-12 9-12t9 12v48z"/><path fill="${a}" d="M80 88V56q0-10 8-10t8 10v32z"/></g>
<g fill="${b}"><circle cx="23" cy="48" r="3"/><circle cx="47" cy="30" r="3.4"/><circle cx="47" cy="52" r="3"/><circle cx="71" cy="44" r="3"/><circle cx="88" cy="64" r="2.6"/></g></svg>`;
const fanSVG = () => `<svg class="d-fan" viewBox="0 0 100 90"><g ${O}><path fill="#c58bff" d="M50 88C20 80 4 50 14 24Q50 -2 86 24C96 50 80 80 50 88z"/>
<path fill="none" stroke-width="2.5" d="M50 86V30M50 70L28 40M50 70L72 40M50 52L36 30M50 52L64 30"/></g></svg>`;
const starSVG = () => `<svg class="d-star" viewBox="0 0 60 60"><polygon points="30,4 37,22 56,22 41,34 47,54 30,42 13,54 19,34 4,22 23,22" fill="#ff9f5a" ${O}/><circle cx="30" cy="28" r="2.4" fill="#ffd2a8"/></svg>`;
const rockSVG = cls => `<svg class="d-rock ${cls}" viewBox="0 0 80 40"><g ${O}><path fill="#9fb0c8" d="M4 38Q6 14 28 12Q46 6 60 16Q76 20 76 38z"/><path fill="none" stroke-width="2.5" d="M16 30Q18 21 30 19"/></g></svg>`;
function kelpSVG(cls, color, hi, dur, delay) {
  const A = 'M20 160C2 130 38 110 20 80C2 50 38 30 20 4', B = 'M20 160C38 130 2 110 20 80C38 50 2 30 20 4';
  const an = REDUCED ? '' : `<animate attributeName="d" dur="${dur}s" begin="${-delay}s" repeatCount="indefinite" values="${A};${B};${A}" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>`;
  const p = (sw, c, extra = '') => `<path d="${A}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" ${extra}>${an}</path>`;
  return `<svg class="d-kelp ${cls}" viewBox="-4 0 48 164">${p(19, NAVY)}${p(12, color)}${p(3, hi, 'stroke-opacity=".8" transform="translate(-2.5 0)"')}</svg>`;
}
function buildDecor(el, lite) {
  el.classList.add('decor'); if (lite) el.classList.add('lite');
  el.innerHTML = '<div class="sand"></div>' +
    (lite ? '' : wreckSVG() + fanSVG() + rockSVG('r1') + rockSVG('r2')) +
    kelpSVG('k1', '#3fcf7b', '#9af5b4', 5.2, 0) + kelpSVG('k2', '#2fbf9a', '#8cf0d6', 4.4, 1.5) +
    (lite ? '' : kelpSVG('k3', '#4fd65f', '#a8f58f', 5.8, 2.4) + kelpSVG('k4', '#2fbf9a', '#8cf0d6', 4.8, .8) + kelpSVG('k5', '#3fcf7b', '#9af5b4', 5.4, 3.1)) +
    castleSVG() + coralSVG('c1', '#ff8a65', '#ffc4ad') + (lite ? '' : coralSVG('c2', '#ff6fa0', '#ffb3cf')) + starSVG();
}
function buildSeabed() {
  const box = $('seabed'), cols = [['#3fcf7b', '#9af5b4'], ['#2fbf9a', '#8cf0d6'], ['#4fd65f', '#a8f58f']];
  const n = Math.max(6, Math.round(innerWidth / 170));
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? (4 + (i * 53) % 18) : (78 + (i * 37) % 18);       // tập trung 2 bên mép
    const wrap = document.createElement('div');
    wrap.innerHTML = kelpSVG('', cols[i % 3][0], cols[i % 3][1], 4 + (i % 4), i * 1.3);
    const svg = wrap.firstChild;
    svg.style.left = (i < n / 2 ? side * 0.6 + i * 3 : 100 - side * 0.6 - (n - i) * 3) + '%';
    svg.style.width = (34 + (i % 3) * 8) + 'px';
    box.appendChild(svg);
  }
}

/* ---- bộ máy cho cá bơi qua - bơi lại ---- */
const groups = [];
function makeGroup(layer, o) {
  const g = { layer, o, fish: [] };
  for (let i = 0; i < o.count; i++) {
    const type = FISH_TYPES[(i + (o.off || 0)) % FISH_TYPES.length];
    const el = document.createElement('div');
    el.className = 'fi';
    el.innerHTML = `<div class="flip">${fishSVG(type)}</div>`;
    if (o.opacity) el.style.opacity = o.opacity;
    el.style.setProperty('--tail', rand(.32, .6).toFixed(2) + 's');
    layer.appendChild(el);
    const f = { el, flip: el.firstChild, rel: rand(o.rel[0], o.rel[1]), w: 0, curW: 0, init: false,
      x: 0, y: 0, ty: 0, dir: Math.random() < .5 ? 1 : -1, speed: rand(28, 62), ph: rand(0, 6.28), next: 0, nextY: 0 };
    f.flip.style.transform = `scaleX(${f.dir})`;
    g.fish.push(f);
  }
  groups.push(g);
  return g;
}
function turn(f) { f.flip.style.transform = `scaleX(${f.dir})`; }
let last = performance.now(), tankLvl = null;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (const g of groups) {
    if (!g.o.visible()) continue;
    const b = g.o.bounds(dt);
    if (!b.w) continue;
    const st = g.o.state ? g.o.state() : 0;
    for (const f of g.fish) {
      f.w = Math.max(g.o.minW, b.w * f.rel);
      if (Math.abs(f.w - f.curW) > 1) { f.curW = f.w; f.el.style.width = f.w + 'px'; }
      const fh = f.w * .63, ymax = b.bottom - fh, ymin = Math.min(b.top, ymax);
      if (!f.init) { f.init = true; f.x = rand(0, Math.max(1, b.w - f.w)); f.y = rand(ymin, ymax); f.ty = f.y; }
      const sp = f.speed * (b.w / 700) * (st === 2 ? 0 : st === 1 ? .45 : 1);
      f.x += f.dir * sp * dt;
      if (f.dir > 0 && f.x >= b.w - f.w) { f.dir = -1; turn(f); }
      else if (f.dir < 0 && f.x <= 0) { f.dir = 1; turn(f); }
      f.x = clamp(f.x, 0, Math.max(0, b.w - f.w));
      if (now > f.next) {                      // thỉnh thoảng quay đầu giữa chừng
        if (Math.random() < .45 && f.x > f.w && f.x < b.w - 2 * f.w && st < 2) { f.dir *= -1; turn(f); }
        f.next = now + rand(3000, 9000);
      }
      if (now > f.nextY) {
        f.ty = st ? ymax - Math.random() * (ymax - ymin) * .2 : rand(ymin, ymax);
        f.nextY = now + rand(2200, 5200);
      }
      f.y += (f.ty - f.y) * Math.min(1, dt * 1.2);
      f.y = clamp(f.y, ymin, ymax);
      const yy = f.y + Math.sin(now / 700 + f.ph) * (st ? 1 : 4);
      let ang = clamp((f.ty - f.y) * .12, -14, 14) * f.dir;
      if (st === 2) ang = f.dir * (30 + Math.sin(now / 240 + f.ph) * 10);   // cạn nước: cá nằm thoi thóp
      f.el.style.transform = `translate(${f.x.toFixed(1)}px,${yy.toFixed(1)}px) rotate(${ang.toFixed(1)}deg)`;
    }
  }
  if (!REDUCED) requestAnimationFrame(frame);
}

/* ---------- Bọt nước ---------- */
function spawnBgBubbles() {
  if (REDUCED) return;
  for (let i = 0; i < 30; i++) {
    const b = document.createElement('i'), s = rand(6, 22);
    b.className = 'bub';
    b.style.cssText = `left:${rand(0, 100)}%;width:${s}px;height:${s}px;--dx:${rand(-40, 40)}px;animation-duration:${rand(8, 20)}s;animation-delay:${-rand(0, 18)}s`;
    $('bubbles').appendChild(b);
  }
}
function spawnTankBubbles() {
  for (let i = 0; i < 16; i++) {
    const b = document.createElement('i'), s = rand(5, 13);
    b.className = 'tb';
    b.style.cssText = `left:${rand(4, 94)}%;width:${s}px;height:${s}px;animation-duration:${rand(4, 9)}s;animation-delay:${-rand(0, 9)}s`;
    $('tbubbles').appendChild(b);
  }
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('i'), s = rand(2, 6);
    p.className = 'sp';
    p.style.cssText = `left:${rand(0, 98)}%;top:${rand(4, 96)}%;width:${s}px;height:${s}px;animation-duration:${rand(3, 7)}s;animation-delay:${-rand(0, 5)}s`;
    $('specks').appendChild(p);
  }
}
let tankReady = false;
function initTank() {
  if (tankReady) return; tankReady = true;
  buildDecor($('decor'));
  spawnTankBubbles();
  const tank = $('tank');
  makeGroup($('fish'), {
    count: 7, rel: [.075, .125], minW: 36, off: 0,
    visible: () => !$('app').hidden,
    state: () => S.w1 < 8 ? 2 : S.w1 < LOW ? 1 : 0,
    bounds: dt => {
      const w = tank.clientWidth, h = tank.clientHeight, target = (6 + clamp(S.w1, 0, 100) * .84) / 100;
      tankLvl = tankLvl === null ? target : tankLvl + (target - tankLvl) * Math.min(1, dt * 2.2);
      return { w, top: h * (1 - tankLvl) + 14, bottom: h * .93 };
    }
  });
}

/* =====================================================================
   ĐĂNG NHẬP / ĐĂNG KÝ (lưu trong localStorage – chỉ dùng để học)
   ===================================================================== */
let regMode = false;
const users = () => JSON.parse(localStorage.getItem('aq_users') || '{}');
async function hash(s) {
  if (crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  return btoa(s);
}
function setMode(reg) {
  regMode = reg;
  $('tabLogin').classList.toggle('active', !reg);
  $('tabReg').classList.toggle('active', reg);
  $('p2wrap').hidden = !reg;
  $('authBtn').textContent = reg ? 'Tạo tài khoản' : 'Đăng nhập';
  $('authMsg').textContent = '';
}
$('tabLogin').onclick = () => setMode(false);
$('tabReg').onclick = () => setMode(true);
$('authBtn').onclick = async () => {
  const u = $('u').value.trim(), p = $('p').value, msg = $('authMsg');
  if (!u || !p) return msg.textContent = 'Nhập tên đăng nhập và mật khẩu.';
  const db = users();
  if (regMode) {
    if (p.length < 4) return msg.textContent = 'Mật khẩu cần ít nhất 4 ký tự.';
    if (p !== $('p2').value) return msg.textContent = 'Hai mật khẩu chưa giống nhau.';
    if (db[u]) return msg.textContent = 'Tên đăng nhập đã có người dùng.';
    db[u] = await hash(p);
    localStorage.setItem('aq_users', JSON.stringify(db));
    setMode(false);
    msg.textContent = 'Đăng ký xong. Hãy đăng nhập.';
  } else {
    if (db[u] !== await hash(p)) return msg.textContent = 'Sai tên đăng nhập hoặc mật khẩu.';
    sessionStorage.setItem('aq_user', u);
    showApp();
  }
};
['u', 'p', 'p2'].forEach(id => $(id).addEventListener('keydown', e => e.key === 'Enter' && $('authBtn').click()));
$('logout').onclick = () => { sessionStorage.removeItem('aq_user'); location.reload(); };

/* =====================================================================
   DỮ LIỆU CẢM BIẾN
   (độ đục chỉ đo ở BỂ CÁ CHÍNH – bình dự trữ không có cảm biến đục)
   ===================================================================== */
const S = { w1: 70, w2: 80, t1: 10, ph: 7.2, pump: false, light: true };
let hardware = false, port = null, writer = null;

function logic() { // giống logic trong file .ino
  if (S.w1 < LOW && S.w2 >= LOW) S.pump = true;
  if (S.w1 >= 60 || S.w2 < LOW) S.pump = false;
}

/* màu nước đổi liên tục theo pH */
const PH_STOPS = [
  [4.0, '#dbe83c', '#86a312'], [5.5, '#b5e450', '#58a83c'], [6.5, '#4fd4c0', '#1f9fa0'],
  [7.2, '#46c9f0', '#2191d4'], [8.0, '#7d94f0', '#4d5fd0'], [9.0, '#b184ee', '#7646c6'], [10, '#c46fe0', '#6a2aa6']
];
const h2r = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixc = (a, b, t) => '#' + h2r(a).map((v, i) => Math.round(v + (h2r(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
function phColors(ph) {
  ph = clamp(ph, 4, 10);
  for (let i = 0; i < PH_STOPS.length - 1; i++) {
    const a = PH_STOPS[i], b = PH_STOPS[i + 1];
    if (ph <= b[0]) { const t = (ph - a[0]) / (b[0] - a[0]); return [mixc(a[1], b[1], t), mixc(a[2], b[2], t)]; }
  }
  const e = PH_STOPS[PH_STOPS.length - 1]; return [e[1], e[2]];
}

function render() {
  const noWater = S.w1 < LOW && S.w2 < LOW;
  const lowW = S.w1 < LOW || S.w2 < LOW;
  const dirty = S.t1 >= TURB_MAX;
  const phHigh = S.ph > PH_MAX, phLow = S.ph < PH_MIN;
  const w1 = Math.round(S.w1), w2 = Math.round(S.w2), t1 = Math.round(S.t1), ph = S.ph.toFixed(1);
  const alerts = [];
  if (noWater) alerts.push(['⛔', 'Hết nước – đã dừng bơm', `Bể cá còn ${w1}% và bình dự trữ còn ${w2}% (dưới ${LOW}%). Hãy châm thêm nước vào bình dự trữ.`, 0, 'w-out']);
  else if (S.w1 < LOW) alerts.push(['💧', `Thiếu nước trong bể cá (${w1}%)`, `Mực nước dưới ${LOW}%. Đang bơm bù từ bình dự trữ (còn ${w2}%).`, 0, 'w-low']);
  else if (S.w2 < LOW) alerts.push(['💧', `Bình dự trữ sắp hết (${w2}%)`, `Dưới ${LOW}%, không còn đủ nước để bơm bù cho bể cá (đang ${w1}%). Hãy châm thêm nước.`, 1, 'w-res']);
  if (dirty) alerts.push(['🟤', `Nước bể cá bị đục (${t1}%)`, `Đã đạt ngưỡng ${TURB_MAX}% trở lên, có thể do phân cá hoặc thức ăn thừa. Nên giảm lượng thức ăn và thay một phần nước.`, 0, 'turb']);
  if (phHigh) alerts.push(['🧪', `pH quá cao (${ph})`, `Vượt ngưỡng ${PH_MAX}: nước quá kiềm, cá dễ bị stress. Nước bể chuyển sang màu tím. Hãy thay một phần nước.`, 0, 'ph-hi']);
  if (phLow) alerts.push(['🧪', `pH quá thấp (${ph})`, `Dưới ngưỡng ${PH_MIN}: nước quá axit, hại mang cá. Nước bể chuyển sang màu vàng xanh. Hãy thay một phần nước.`, 0, 'ph-lo']);
  const html = alerts.map(a => `<div class="toast${a[3] ? ' warn' : ''}"><span class="t-ico">${a[0]}</span><div><b>${a[1]}</b><p>${a[2]}</p></div></div>`).join('');
  if ($('alerts').dataset.h !== html) { $('alerts').innerHTML = html; $('alerts').dataset.h = html; }
  Alarm.update(alerts);

  // đèn cảnh báo
  $('ledW').classList.toggle('bad', lowW);
  $('ledT').classList.toggle('bad', dirty);
  $('ledP').classList.toggle('bad', phHigh || phLow);

  // mực nước
  const bar = (id, v, cls) => { $(id).style.width = clamp(v, 0, 100) + '%'; $(id).className = cls || ''; };
  bar('barW1', S.w1, S.w1 < LOW ? 'bad' : ''); bar('barW2', S.w2, S.w2 < LOW ? 'bad' : '');
  $('vW1').textContent = w1 + '%'; $('vW2').textContent = w2 + '%';
  $('pump').textContent = S.pump ? 'ĐANG BƠM' : (noWater ? 'DỪNG (hết nước)' : 'TẮT');
  badge('bW', lowW, '⚠ Thấp', 'Ổn');
  const tank = $('tank');
  tank.style.setProperty('--lvl', (6 + clamp(S.w1, 0, 100) * .84) + '%');   // nước cạn thật sự khi w1 xuống thấp
  tank.classList.toggle('low', S.w1 < LOW);
  tank.classList.toggle('dry', S.w1 < 8);
  tank.classList.toggle('pumping', S.pump);
  $('cardW').classList.toggle('run', S.pump);
  Snd.setPump(S.pump);

  // độ đục (chỉ bể chính)
  bar('barT1', S.t1, S.t1 > TURB_MAX ? 'bad' : 'brown');
  $('vT1').textContent = t1 + '%';
  badge('bT', dirty, '⚠ Đục', 'Trong');
  $('turbid').style.opacity = Math.min(.85, S.t1 / 100 * .9);
  $('specks').style.opacity = clamp(S.t1 / TURB_MAX, 0, 1);

  // pH + màu nước
  $('vP').textContent = 'pH ' + ph;
  $('phTxt').textContent = phHigh ? '– kiềm cao' : phLow ? '– axit cao' : '– bình thường';
  $('phPin').style.left = clamp((S.ph - 4) / 6 * 100, 0, 100) + '%';
  badge('bP', phHigh || phLow, phHigh ? '⚠ Cao' : '⚠ Thấp', 'Ổn');
  const [ct, cb] = phColors(S.ph), root = document.documentElement.style;
  root.setProperty('--wtop', ct); root.setProperty('--wbot', cb);

  // đèn hồ
  $('dark').classList.toggle('on', !S.light);
  $('lightBtn').textContent = S.light ? 'Tắt đèn' : 'Bật đèn';
  $('lightBtn').classList.toggle('on', S.light);
}
function badge(id, bad, t1, t0) { const e = $(id); e.textContent = bad ? t1 : t0; e.classList.toggle('bad', bad); }

/* ---------- Mô phỏng ---------- */
const sims = { sW1: 'w1', sW2: 'w2', sT1: 't1' };
Object.keys(sims).forEach(id => $(id).oninput = e => { S[sims[id]] = +e.target.value; logic(); render(); });
$('sP').oninput = e => { S.ph = e.target.value / 10; render(); };
setInterval(() => {
  if (hardware) return;
  if (S.pump) { S.w1 = Math.min(100, S.w1 + 3); S.w2 = Math.max(0, S.w2 - 2); }
  [['sW1', 'w1'], ['sW2', 'w2'], ['sT1', 't1']].forEach(([i, k]) => $(i).value = S[k]);
  logic(); render();
}, 1000);

/* ---------- Đèn ---------- */
$('lightBtn').onclick = () => {
  S.light = !S.light;
  if (writer) writer.write(S.light ? 'L1\n' : 'L0\n');
  render();
};

/* ---------- Kết nối Arduino (Web Serial – Chrome/Edge) ---------- */
$('connect').onclick = async () => {
  if (!('serial' in navigator)) return alert('Trình duyệt chưa hỗ trợ Web Serial. Hãy dùng Chrome hoặc Edge.');
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
  } catch (e) { return; }
  hardware = true;
  $('mode').textContent = 'Đã nối Arduino'; $('mode').style.cursor = 'default'; $('mode').classList.add('hw');
  $('sim').hidden = true; $('connect').hidden = true;
  const enc = new TextEncoderStream();
  enc.readable.pipeTo(port.writable);
  writer = enc.writable.getWriter();
  const reader = port.readable.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      try {
        const d = JSON.parse(line);
        Object.assign(S, { w1: d.w1, w2: d.w2, t1: d.t1, ph: d.ph, pump: !!d.pump, light: !!d.light });
        render();
      } catch (e) { /* bỏ qua dòng lỗi */ }
    }
  }
};

/* ---------- Khởi động ---------- */
function showApp() {
  $('auth').hidden = true; $('app').hidden = false;
  $('who').textContent = sessionStorage.getItem('aq_user');
  initTank(); logic(); render();
}
buildSeabed();
spawnBgBubbles();
buildDecor($('authScene').insertBefore(document.createElement('div'), $('authFish')), true);
makeGroup($('bgfish'), {
  count: 8, rel: [.035, .07], minW: 44, off: 2, opacity: .7,
  visible: () => true,
  bounds: () => ({ w: innerWidth, top: 70, bottom: innerHeight - 70 })
});
makeGroup($('authFish'), {
  count: 3, rel: [.14, .2], minW: 44, off: 0,
  visible: () => !$('auth').hidden,
  bounds: () => { const s = $('authScene'); return { w: s.clientWidth, top: 10, bottom: s.clientHeight * .8 }; }
});
requestAnimationFrame(frame);
if (sessionStorage.getItem('aq_user')) showApp();

$('mode').onclick = () => {
  if (hardware) return;
  $('sim').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('sim').style.outline = '4px solid #ffae2b';
  setTimeout(() => $('sim').style.outline = '', 1500);
};

/* nút nào được bấm thì chuyển sang màu cam */
function pick(el) {
  document.querySelectorAll('.top-r .sel').forEach(e => e.classList.remove('sel'));
  if (el) el.classList.add('sel');
}
$('mode').addEventListener('click', () => pick($('mode')));
$('logout').addEventListener('click', () => pick($('logout')));
$('connect').addEventListener('click', () => {
  pick($('connect'));
  // nếu người dùng huỷ chọn cổng COM thì quay lại trạng thái mô phỏng
  const t = setInterval(() => {
    if (hardware) { pick(null); clearInterval(t); }
  }, 300);
  setTimeout(() => { clearInterval(t); if (!hardware) pick($('mode')); }, 20000);
});
