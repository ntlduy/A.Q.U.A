'use strict';
const $ = id => document.getElementById(id);
const LOW = 20, TURB_MAX = 60, PH_MIN = 6.5, PH_MAX = 8.0;

/* ---------- Cá & bọt nước ---------- */
const COLORS = [['#ff9f43','#ee5a24'],['#feca57','#ff9f43'],['#48dbfb','#0abde3'],['#ff6b81','#ee5253'],['#1dd1a1','#10ac84']];
function fishSVG(c, w = 80) {
  return `<svg width="${w}" height="${w * .5}" viewBox="0 0 80 40"><g class="tail"><path d="M14 20 2 6v28z" fill="${c[1]}"/></g>
  <ellipse cx="44" cy="20" rx="32" ry="15" fill="${c[0]}"/><path d="M34 6q10-6 20 0z" fill="${c[1]}"/>
  <circle cx="62" cy="16" r="3.5" fill="#fff"/><circle cx="63" cy="16" r="1.7" fill="#111"/></svg>`;
}
function spawnBgFish() {
  const box = $('bgfish');
  for (let i = 0; i < 9; i++) {
    const d = document.createElement('div');
    d.className = 'fsh' + (i % 2 ? ' l' : '');
    d.style.top = (8 + Math.random() * 78) + '%';
    d.style.animationDuration = (18 + Math.random() * 22) + 's';
    d.style.animationDelay = (-Math.random() * 30) + 's';
    d.style.opacity = .55 + Math.random() * .4;
    d.innerHTML = `<div class="bob">${fishSVG(COLORS[i % 5], 40 + Math.random() * 40)}</div>`;
    box.appendChild(d);
  }
  for (let i = 0; i < 30; i++) {
    const b = document.createElement('i');
    const s = 5 + Math.random() * 16;
    b.className = 'bub';
    b.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;--dx:${Math.random() * 60 - 30}px;animation-duration:${7 + Math.random() * 12}s;animation-delay:${-Math.random() * 15}s`;
    $('bubbles').appendChild(b);
  }
}
function spawnTankFish() {
  $('tank').style.setProperty('--tw', $('tank').clientWidth + 'px');
  for (let i = 0; i < 7; i++) {
    const d = document.createElement('div');
    d.className = 'tf' + (i % 2 ? ' l' : '');
    d.style.top = (12 + Math.random() * 55) + '%';
    d.style.animationDuration = (14 + Math.random() * 14) + 's';
    d.style.animationDelay = (-Math.random() * 20) + 's';
    d.innerHTML = `<div class="bob" style="animation-delay:${-Math.random() * 3}s">${fishSVG(COLORS[i % 5], 50 + Math.random() * 30)}</div>`;
    $('fish').appendChild(d);
  }
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('i');
    const s = 4 + Math.random() * 8;
    b.className = 'tb';
    b.style.cssText = `left:${5 + Math.random() * 90}%;width:${s}px;height:${s}px;animation-duration:${4 + Math.random() * 6}s;animation-delay:${-Math.random() * 8}s`;
    $('tbubbles').appendChild(b);
  }
}

/* ---------- Đăng nhập / đăng ký (lưu trong localStorage – chỉ dùng để học) ---------- */
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

/* ---------- Dữ liệu cảm biến ---------- */
const S = { w1: 70, w2: 80, t1: 10, t2: 10, ph: 7.2, pump: false, filter: false, light: true };
let hardware = false, port = null, writer = null;

function logic() { // giống logic trong file .ino
  if (S.w1 < LOW && S.w2 >= LOW) S.pump = true;
  if (S.w1 >= 60 || S.w2 < LOW) S.pump = false;
  S.filter = S.t1 > TURB_MAX || S.t2 > TURB_MAX;
}

function render() {
  const noWater = S.w1 < LOW && S.w2 < LOW;
  const lowW = S.w1 < LOW || S.w2 < LOW;
  const dirty = S.t1 > TURB_MAX || S.t2 > TURB_MAX;
  const phHigh = S.ph > PH_MAX, phLow = S.ph < PH_MIN;
  const w1 = Math.round(S.w1), w2 = Math.round(S.w2), t1 = Math.round(S.t1), t2 = Math.round(S.t2), ph = S.ph.toFixed(1);
  const alerts = [];
  if (noWater) alerts.push(['⛔', 'Hết nước – đã dừng bơm', `Bể cá còn ${w1}% và bình dự trữ còn ${w2}% (dưới ${LOW}%). Hãy châm thêm nước vào bình dự trữ.`, 0]);
  else if (S.w1 < LOW) alerts.push(['💧', `Thiếu nước trong bể cá (${w1}%)`, `Mực nước dưới ${LOW}%. Đang bơm bù từ bình dự trữ (còn ${w2}%).`, 0]);
  else if (S.w2 < LOW) alerts.push(['💧', `Bình dự trữ sắp hết (${w2}%)`, `Dưới ${LOW}%, không còn đủ nước để bơm bù cho bể cá (đang ${w1}%). Hãy châm thêm nước.`, 1]);
  if (dirty) alerts.push(['🟤', `Nước bị đục (bể ${t1}%, bình ${t2}%)`, `Vượt ngưỡng ${TURB_MAX}%, có thể do phân cá hoặc thức ăn thừa. Máy lọc đang chạy – nên giảm lượng thức ăn.`, 0]);
  if (phHigh) alerts.push(['🧪', `pH quá cao (${ph})`, `Vượt ngưỡng ${PH_MAX}: nước quá kiềm, cá dễ bị stress. Nước bể chuyển sang màu tím. Hãy thay một phần nước.`, 0]);
  if (phLow) alerts.push(['🧪', `pH quá thấp (${ph})`, `Dưới ngưỡng ${PH_MIN}: nước quá axit, hại mang cá. Nước bể chuyển sang màu vàng xanh. Hãy thay một phần nước.`, 0]);
  const html = alerts.map(a => `<div class="toast${a[3] ? ' warn' : ''}"><span class="t-ico">${a[0]}</span><div><b>${a[1]}</b><p>${a[2]}</p></div></div>`).join('');
  if ($('alerts').dataset.h !== html) { $('alerts').innerHTML = html; $('alerts').dataset.h = html; }

  // đèn cảnh báo
  $('ledW').classList.toggle('bad', lowW);
  $('ledT').classList.toggle('bad', dirty);
  $('ledP').classList.toggle('bad', phHigh || phLow);

  // mực nước
  const bar = (id, v, cls) => { $(id).style.width = Math.max(0, Math.min(100, v)) + '%'; $(id).className = cls || ''; };
  bar('barW1', S.w1, S.w1 < LOW ? 'bad' : ''); bar('barW2', S.w2, S.w2 < LOW ? 'bad' : '');
  $('vW1').textContent = Math.round(S.w1) + '%'; $('vW2').textContent = Math.round(S.w2) + '%';
  $('pump').textContent = S.pump ? 'ĐANG BƠM' : (noWater ? 'DỪNG (hết nước)' : 'TẮT');
  badge('bW', lowW, '⚠ Thấp', 'Ổn');
  $('tank').style.setProperty('--lvl', (25 + Math.max(0, Math.min(100, S.w1)) * .62) + '%');

  // độ đục
  bar('barT1', S.t1, S.t1 > TURB_MAX ? 'bad' : 'brown'); bar('barT2', S.t2, S.t2 > TURB_MAX ? 'bad' : 'brown');
  $('vT1').textContent = Math.round(S.t1) + '%'; $('vT2').textContent = Math.round(S.t2) + '%';
  $('filter').textContent = S.filter ? 'ĐANG LỌC' : 'TẮT';
  badge('bT', dirty, '⚠ Đục', 'Trong');
  $('turbid').style.opacity = Math.min(.85, S.t1 / 100 * .9);

  // pH + màu nước
  $('vP').textContent = 'pH ' + S.ph.toFixed(1);
  $('phTxt').textContent = phHigh ? '– kiềm cao' : phLow ? '– axit cao' : '– bình thường';
  $('phPin').style.left = ((S.ph - 4) / 6 * 100) + '%';
  badge('bP', phHigh || phLow, phHigh ? '⚠ Cao' : '⚠ Thấp', 'Ổn');
  const root = document.documentElement.style;
  if (phHigh) { root.setProperty('--wtop', '#9b7be8'); root.setProperty('--wbot', '#45288a'); }
  else if (phLow) { root.setProperty('--wtop', '#c9d84a'); root.setProperty('--wbot', '#5f7a1e'); }
  else { root.setProperty('--wtop', '#2bb6c9'); root.setProperty('--wbot', '#0b4a63'); }

  // đèn hồ
  $('dark').classList.toggle('on', !S.light);
  $('lightBtn').textContent = S.light ? 'Tắt đèn' : 'Bật đèn';
  $('lightBtn').classList.toggle('on', S.light);
}
function badge(id, bad, t1, t0) { const e = $(id); e.textContent = bad ? t1 : t0; e.classList.toggle('bad', bad); }

/* ---------- Mô phỏng ---------- */
const sims = { sW1: 'w1', sW2: 'w2', sT1: 't1', sT2: 't2' };
Object.keys(sims).forEach(id => $(id).oninput = e => { S[sims[id]] = +e.target.value; logic(); render(); });
$('sP').oninput = e => { S.ph = e.target.value / 10; render(); };
setInterval(() => {
  if (hardware) return;
  if (S.pump) { S.w1 = Math.min(100, S.w1 + 3); S.w2 = Math.max(0, S.w2 - 2); }
  if (S.filter) { S.t1 = Math.max(0, S.t1 - 3); S.t2 = Math.max(0, S.t2 - 3); }
  [['sW1', 'w1'], ['sW2', 'w2'], ['sT1', 't1'], ['sT2', 't2']].forEach(([i, k]) => $(i).value = S[k]);
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
        Object.assign(S, { w1: d.w1, w2: d.w2, t1: d.t1, t2: d.t2, ph: d.ph, pump: !!d.pump, filter: !!d.filter, light: !!d.light });
        render();
      } catch (e) { /* bỏ qua dòng lỗi */ }
    }
  }
};

/* ---------- Khởi động ---------- */
function showApp() {
  $('auth').hidden = true; $('app').hidden = false;
  $('who').textContent = sessionStorage.getItem('aq_user');
  spawnTankFish(); logic(); render();
}
spawnBgFish();
if (sessionStorage.getItem('aq_user')) showApp();

$('mode').onclick = () => {
  if (hardware) return;
  $('sim').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $('sim').style.outline = '3px solid #f5b83d';
  setTimeout(() => $('sim').style.outline = '', 1500);
};

/* nút nào được bấm thì chuyển sang màu đỏ */
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
