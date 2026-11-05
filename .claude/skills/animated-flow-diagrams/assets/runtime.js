/* Animated flow diagram runtime. Reads the spec from <script id="fds-spec">, renders an SVG canvas.
   Deterministic: every frame is derived from one playhead time t, so scrubbing/back/forward are exact. */
(function () {
'use strict';
const SPEC = JSON.parse(document.getElementById('fds-spec').textContent);
const NS = 'http://www.w3.org/2000/svg';
const FONT = 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif';

// ---------------------------------------------------------------- helpers
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;   // easeInOutQuad
const easeOut = p => 1 - Math.pow(1 - p, 3);
function svg(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
const icon = d => { const s = svg('svg', { viewBox: '0 0 24 24' }); svg('path', { d }, s); return s; };
const MUI = {
  play: 'M8 5v14l11-7z', pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z', next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  prev: 'M6 6h2v12H6zm3.5 6l8.5 6V6z', replay: 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z',
  kbd: 'M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  fit: 'M5 5h5v2H7v3H5V5zm9 0h5v5h-2V7h-3V5zM5 14h2v3h3v2H5v-5zm12 3v-3h2v5h-5v-2h3z',
  moon: 'M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
  info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  size: 'M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z',
  tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  reset: 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z'
};

// ---------------------------------------------------------------- defaults
const S = Object.assign({ title: 'Diagram', type: 'dataflow', mode: 'scenes', theme: 'auto', loop: true,
  autoAdvance: false, autoplay: false, focus: true, pace: 1, nodes: [], edges: [], groups: [], scenes: [] }, SPEC);
S.layout = Object.assign({ mode: 'layered', direction: 'LR', rankGap: 150, nodeGap: 46 }, SPEC.layout || {});
const TYPE_NAMES = { dataflow: 'Data flow diagram', context: 'System context diagram', logical: 'Logical architecture', physical: 'Physical architecture' };
const KEYS_DEFAULT = {
  sizeUp: ['+', '='], sizeDown: ['-', '_'], toggleSize: ['s'],
  playPause: ['Space', 'k'], prevScene: ['ArrowLeft'], nextScene: ['ArrowRight'], prevStep: [',', '<'], nextStep: ['.', '>'],
  speedUp: ['ArrowUp', ']'], speedDown: ['ArrowDown', '['], restart: ['r', 'Home'], toggleControls: ['c'], toggleHelp: ['?', 'h'],
  toggleMode: ['m'], fit: ['f'], togglePanel: ['p'], toggleLegend: ['l'], toggleTheme: ['t'], toggleCamera: ['a']
};
const KEYMAP = Object.assign({}, KEYS_DEFAULT, (SPEC.keys && SPEC.keys.map) || {});
const MOD_SLOW = (SPEC.keys && SPEC.keys.slowModifier) || 'Shift';
const MOD_FAST = (SPEC.keys && SPEC.keys.fastModifier) || 'Alt';
const SLOW_F = 0.35, FAST_F = 2.5;
const MIN_K = 0.8;   // never auto-fit below this zoom: keeps the smallest text >= 8px on screen
let TS = 1, BS = 1;  // text scale, component scale (user adjustable)
const SIZE_KEY = 'fds-size:' + (SPEC.id || SPEC.title);
try { const z = JSON.parse(localStorage.getItem(SIZE_KEY) || 'null'); if (z) { TS = clamp(z[0], .8, 2.2); BS = clamp(z[1], .8, 2.2); } } catch (e) { }
document.documentElement.style.setProperty('--ts', TS); document.documentElement.style.setProperty('--tsn', TS / BS);
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

// ---------------------------------------------------------------- kinds
const KIND = {
  actor:     { c: '#9c27b0', name: 'Person / actor',        w: 152, h: 64, ic: 'M12 4a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM5 20c0-3.9 3.1-7 7-7s7 3.1 7 7' },
  service:   { c: '#1976d2', name: 'Service / process',     w: 180, h: 64, ic: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5' },
  gateway:   { c: '#3949ab', name: 'Gateway / router',      w: 180, h: 64, ic: 'M3 8h14M13 4l4 4-4 4M21 16H7M11 12l-4 4 4 4' },
  database:  { c: '#2e7d32', name: 'Database',              w: 160, h: 90, ic: '' },
  storage:   { c: '#00897b', name: 'Object / file store',   w: 160, h: 90, ic: '' },
  queue:     { c: '#ed6c02', name: 'Queue / topic',         w: 214, h: 80, ic: 'M3 7h4v10H3zM10 7h4v10h-4zM17 7h4v10h-4z' },
  cache:     { c: '#d81b60', name: 'Cache',                 w: 164, h: 64, ic: 'M13 2L4 14h7l-1 8 9-12h-7z' },
  external:  { c: '#546e7a', name: 'External system',       w: 170, h: 64, ic: 'M6.5 18a4 4 0 010-8 6 6 0 0111.4-1.2A4.6 4.6 0 0117.5 18z' },
  server:    { c: '#455a64', name: 'Server / VM',           w: 172, h: 64, ic: 'M4 4h16v6H4zM4 14h16v6H4zM7 7h.01M7 17h.01' },
  container: { c: '#0288d1', name: 'Container / pod',       w: 172, h: 64, ic: 'M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12L3 7' },
  device:    { c: '#6d4c41', name: 'Device / client',       w: 160, h: 64, ic: 'M4 5h16v11H4zM9 20h6M12 16v4' },
  cloud:     { c: '#5c6bc0', name: 'Cloud / network',       w: 176, h: 64, ic: 'M6.5 18a4 4 0 010-8 6 6 0 0111.4-1.2A4.6 4.6 0 0117.5 18z' }
};
const PALETTE = ['#1976d2', '#9c27b0', '#ed6c02', '#2e7d32', '#d32f2f', '#0288d1', '#c2185b', '#00897b'];
const hashIdx = s => { let x = 0; for (const ch of String(s)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x % PALETTE.length; };
const msgColor = k => k ? PALETTE[hashIdx(k)] : null;

// ---------------------------------------------------------------- text fitting
const mctx = document.createElement('canvas').getContext('2d');
function tw(s, font) { mctx.font = font; return mctx.measureText(s).width; }
function ellipsize(s, maxW, font) {
  if (tw(s, font) <= maxW) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tw(s.slice(0, m).trimEnd() + '…', font) <= maxW) lo = m; else hi = m - 1; }
  return s.slice(0, lo).trimEnd() + '…';
}
function fit(text, maxW, font, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean), lines = [];
  let cur = '', i = 0;
  for (; i < words.length; i++) {
    const t = cur ? cur + ' ' + words[i] : words[i];
    if (tw(t, font) <= maxW) { cur = t; continue; }
    if (!cur) { cur = words[i]; continue; }
    if (lines.length === maxLines - 1) break;
    lines.push(cur); cur = words[i];
  }
  let truncated = false;
  if (i < words.length) { cur = cur + ' ' + words.slice(i).join(' '); truncated = true; }
  if (tw(cur, font) > maxW) { cur = ellipsize(cur, maxW, font); truncated = true; }
  lines.push(cur);
  return { lines, truncated };
}

// ---------------------------------------------------------------- model
const nodes = {}, nodeList = [], edges = [], groups = {}, groupList = [];
S.nodes.forEach((n, i) => {
  const k = KIND[n.kind] || KIND.service;
  const o = Object.assign({ kind: 'service', fill: 0, _i: i }, n);
  o.k = k; o.w0 = n.w || k.w; o.h0 = n.h || k.h; o.w = o.w0 * BS; o.h = o.h0 * BS; o.color = n.color || k.c;
  if (n.x != null) o.x = n.x * BS; if (n.y != null) o.y = n.y * BS;
  nodes[o.id] = o; nodeList.push(o);
});
S.groups.forEach((g, i) => { const o = Object.assign({ _i: i }, g); groups[o.id] = o; groupList.push(o); });
S.edges.forEach((e, i) => {
  const o = Object.assign({ _i: i, id: e.id || ('e' + i) }, e);
  if (nodes[o.from] && nodes[o.to]) edges.push(o);
});
const edgeById = {}; edges.forEach(e => edgeById[e.id] = e);
function resolveEdge(ref) {
  if (edgeById[ref]) return edgeById[ref];
  const m = String(ref).split(/\s*(?:->|>|→)\s*/);
  if (m.length === 2) return edges.find(e => e.from === m[0] && e.to === m[1]);
  return null;
}

// ---------------------------------------------------------------- layout
const cxy = n => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });
function layoutAuto() {
  const L = S.layout, LR = L.direction !== 'TB';
  if (!SPEC.layout || SPEC.layout.rankGap == null) {
    const pw = Math.max(0, ...edges.filter(e => e.label && tw(e.label, (11 * TS) + 'px ' + FONT) <= 120).map(e => tw(e.label, (11 * TS) + 'px ' + FONT) + 16));
    L.rankGap = LR ? Math.max(100 * BS, Math.min(190 * BS, pw + 56)) : Math.max(90, Math.min(130, 90 + (pw > 80 ? 20 : 0)));
  }
  const free = nodeList.filter(n => n.x == null || n.y == null);
  if (!free.length) return;
  if (L.mode === 'radial') {
    const center = nodeList.find(n => n.center) || nodeList.slice().sort((a, b) => deg(b) - deg(a))[0];
    const others = free.filter(n => n !== center);
    center.x = -center.w / 2; center.y = -center.h / 2;
    const rings = others.length > 8 ? [others.filter((_, i) => i % 2 === 0), others.filter((_, i) => i % 2 === 1)] : [others];
    rings.forEach((ring, r) => ring.forEach((n, i) => {
      const a = -Math.PI / 2 + (i + (r ? .5 : 0)) * 2 * Math.PI / ring.length, rx = (r ? 640 : 420) * BS, ry = (r ? 400 : 270) * BS;
      n.x = Math.cos(a) * rx - n.w / 2; n.y = Math.sin(a) * ry - n.h / 2;
    }));
    return;
  }
  // layered
  const ids = nodeList.map(n => n.id), out = {}, inn = {};
  ids.forEach(i => { out[i] = []; inn[i] = []; });
  edges.forEach(e => { if (e.from !== e.to) { out[e.from].push(e.to); inn[e.to].push(e.from); } });
  // break cycles via DFS
  const state = {}, back = new Set();
  const dfs = u => { state[u] = 1; out[u].forEach(v => { if (state[v] === 1) back.add(u + '>' + v); else if (!state[v]) dfs(v); }); state[u] = 2; };
  ids.forEach(i => { if (!state[i]) dfs(i); });
  const fwd = {}, bwd = {}; ids.forEach(i => { fwd[i] = []; bwd[i] = []; });
  edges.forEach(e => { if (e.from !== e.to && !back.has(e.from + '>' + e.to)) { fwd[e.from].push(e.to); bwd[e.to].push(e.from); } });
  const rank = {}; const rk = u => rank[u] != null ? rank[u] : (rank[u] = bwd[u].length ? Math.max(...bwd[u].map(rk)) + 1 : 0);
  ids.forEach(rk);
  ids.forEach(u => { if (!bwd[u].length && fwd[u].length) rank[u] = Math.min(...fwd[u].map(v => rank[v])) - 1; });
  const minR = Math.min(...Object.values(rank)); ids.forEach(u => { rank[u] -= minR; if (nodes[u].rank != null) rank[u] = nodes[u].rank; });
  const R = Math.max(...Object.values(rank)) + 1, cols = Array.from({ length: R }, () => []);
  ids.forEach(u => cols[rank[u]].push(u));
  const rootGroup = id => { let g = groups[nodes[id].group]; while (g && g.parent && groups[g.parent]) g = groups[g.parent]; return g ? g._i : -1; };
  const pos = {};
  const setPos = () => cols.forEach(c => c.forEach((u, i) => pos[u] = i));
  setPos();
  const bary = (u, nb) => nb[u].length ? nb[u].reduce((s, v) => s + pos[v], 0) / nb[u].length : pos[u];
  for (let it = 0; it < 10; it++) {
    const down = it % 2 === 0, order = down ? cols.map((_, i) => i) : cols.map((_, i) => R - 1 - i);
    order.forEach(ci => {
      const nb = down ? bwd : fwd, c = cols[ci], b = {};
      c.forEach(u => b[u] = bary(u, nb));
      if (S.layout.groupAware !== false) {
        const ga = {}; c.forEach(u => { const g = rootGroup(u); (ga[g] = ga[g] || []).push(b[u]); });
        const gv = g => ga[g].reduce((s, x) => s + x, 0) / ga[g].length;
        c.sort((p, q) => (rootGroup(p) === rootGroup(q) ? b[p] - b[q] : gv(rootGroup(p)) - gv(rootGroup(q)) || rootGroup(p) - rootGroup(q)));
      } else c.sort((p, q) => b[p] - b[q]);
      c.forEach((u, i) => pos[u] = i);
    });
  }
  let cursor = 0;
  const GAPM = BS;
  cols.forEach(c => {
    const ext = n => LR ? n.w : n.h, cross = n => LR ? n.h : n.w;
    const maxExt = Math.max(...c.map(u => ext(nodes[u])));
    let total = 0; c.forEach((u, i) => { total += cross(nodes[u]) + (i ? (L.nodeGap * BS) + (rootGroup(c[i - 1]) !== rootGroup(u) ? 84 * BS : 0) : 0); });
    let p = -total / 2;
    c.forEach((u, i) => {
      const n = nodes[u]; if (i) p += (L.nodeGap * BS) + (rootGroup(c[i - 1]) !== rootGroup(u) ? 84 * BS : 0);
      const fl = (n.x == null || n.y == null);
      if (fl) { if (LR) { n.x = cursor + (maxExt - n.w) / 2; n.y = p; } else { n.y = cursor + (maxExt - n.h) / 2; n.x = p; } }
      p += cross(n);
    });
    cursor += maxExt + L.rankGap;
  });
}
const deg = n => edges.filter(e => e.from === n.id || e.to === n.id).length;

// ---------------------------------------------------------------- DOM scaffold
const root = document.body;
const stage = svg('svg', { id: 'stage' }); root.appendChild(stage);
const defs = svg('defs', null, stage);
const pat = svg('pattern', { id: 'dots', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, defs);
svg('circle', { cx: 2, cy: 2, r: 1.1, fill: 'var(--dot)' }, pat);
const mk = svg('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 8.6, refY: 5, markerWidth: 9, markerHeight: 9, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, defs);
svg('path', { d: 'M0,1 L9,5 L0,9 z', class: 'arrow' }, mk);
const bgRect = svg('rect', { width: '100%', height: '100%', fill: 'url(#dots)' }, stage);
const vp = svg('g', { id: 'vp' }, stage);
const gLayer = svg('g', null, vp), eLayer = svg('g', null, vp), lLayer = svg('g', null, vp), tLayer = svg('g', null, vp),
  nLayer = svg('g', null, vp), pLayer = svg('g', null, vp);

// ---------------------------------------------------------------- build nodes
const legendTrunc = [], legendEdges = [];
let FT = '', FS = '';
function buildNode(n) {
  const R = TS / BS;   // text relative to its box: node bodies are already scaled by BS
  FT = '500 ' + (13 * R) + 'px ' + FONT; FS = (11 * R) + 'px ' + FONT;
  const g = svg('g', { class: 'node ' + n.kind + (n.kind === 'external' ? '' : ''), 'data-id': n.id }, nLayer);
  g.style.setProperty('--nc', n.color);
  g.style.setProperty('--nc-i', 'var(--nci,' + n.color + ')');
  n._g = g; n._parts = {};
  const body = svg('g', { transform: 'scale(' + BS + ')' }, g); n._body = body;
  const isDB = n.kind === 'database' || n.kind === 'storage', isQ = n.kind === 'queue';
  const label = n.label || n.id;
  if (isDB) {
    const w = n.w0, hh = n.h0, ry = 9;
    const bodyD = `M0,${ry} a${w / 2},${ry} 0 0 1 ${w},0 v${hh - 2 * ry} a${w / 2},${ry} 0 0 1 ${-w},0 z`;
    const cid = 'clip-' + n.id.replace(/\W/g, '_');
    const cp = svg('clipPath', { id: cid }, defs); svg('path', { d: bodyD, transform: 'translate(0,0)' }, cp);
    n._clipPath = cp.firstChild;
    svg('path', { d: bodyD, class: 'card' }, body);
    const lg = svg('g', { 'clip-path': `url(#${cid})` }, body);
    n._parts.level = svg('rect', { class: 'level', x: 0, width: w, y: hh, height: 0 }, lg);
    n._parts.levelline = svg('line', { class: 'levelline', x1: 0, x2: w, y1: hh, y2: hh }, lg);
    svg('path', { d: `M0,${ry} a${w / 2},${ry} 0 0 0 ${w},0`, fill: 'none', stroke: 'var(--divider)', 'stroke-width': 1.2 }, body);
    svg('ellipse', { cx: w / 2, cy: ry, rx: w / 2, ry, fill: 'color-mix(in srgb,var(--nc) 10%,var(--paper))', stroke: 'var(--divider)', 'stroke-width': 1.2 }, body);
    const f = fit(label, w - 24, FT, 2);
    const LH = 16 * R, baseY = ry * 2 + (hh - ry * 2) / 2 - (f.lines.length - 1) * LH / 2 - (n.tech ? 5 * R : 0) + 5 * R;
    f.lines.forEach((ln, i) => { const t = svg('text', { class: 'title', x: w / 2, y: baseY + i * LH, 'text-anchor': 'middle' }, body); t.textContent = ln; });
    if (n.tech) { const t = svg('text', { class: 'sub', x: w / 2, y: baseY + f.lines.length * LH - 2 * R, 'text-anchor': 'middle' }, body); t.textContent = ellipsize(n.tech, w - 24, FS); }
    n._parts.pct = svg('text', { class: 'pct', x: w - 12, y: hh - 8, 'text-anchor': 'end' }, body);
    if (f.truncated) legendTrunc.push(n);
    n._pulseShape = () => svg('path', { d: bodyD, class: 'pulse' }, body);
  } else {
    svg('rect', { class: 'card', width: n.w0, height: n.h0, rx: 10 }, body);
    const ix = 26, iy = isQ ? 24 : n.h0 / 2;
    svg('circle', { class: 'tint', cx: ix, cy: iy, r: isQ ? 13 : 16 }, body);
    const ig = svg('g', { transform: `translate(${ix - 9},${iy - 9}) scale(.75)`, class: 'ink' }, body);
    svg('path', { d: n.k.ic }, ig);
    const tx = isQ ? 46 : 52, maxW = n.w0 - tx - 12;
    const hasSub = !!(n.tech || n.sublabel);
    const f = fit(label, maxW, FT, hasSub && !isQ ? 1 : 2);
    const LH = 16 * R, lines = f.lines, th = lines.length * LH + (hasSub && !isQ ? 15 * R : 0);
    const y0 = isQ ? 26 + 3 * R : (n.h0 - th) / 2 + 12 * R;
    lines.forEach((ln, i) => { const t = svg('text', { class: 'title', x: tx, y: y0 + i * LH }, body); t.textContent = ln; });
    if (hasSub && !isQ) { const t = svg('text', { class: 'sub', x: tx, y: y0 + lines.length * LH + R }, body); t.textContent = ellipsize(n.tech || n.sublabel, maxW, FS); }
    if (f.truncated) legendTrunc.push(n);
    if (isQ) {
      n._rail = { x: 12, y: n.h0 - 32, w: n.w0 - 24, h: 22 };
      svg('rect', { class: 'rail', x: n._rail.x, y: n._rail.y, width: n._rail.w, height: n._rail.h, rx: 6 }, body);
      n._parts.more = svg('text', { class: 'pct', x: n._rail.x + 5, y: n._rail.y + 15 }, body);
      n._chipLayer = svg('g', null, body);
      n._slots = Math.max(1, Math.floor((n._rail.w - 8) / 36));
    }
    n._pulseShape = () => svg('rect', { class: 'pulse', width: n.w0, height: n.h0, rx: 10 }, body);
  }
  n._pulse = null;
  g.addEventListener('pointerdown', ev => startNodeDrag(ev, n));
  g.addEventListener('pointerenter', ev => showNodeTip(n, ev)); g.addEventListener('pointermove', moveTip); g.addEventListener('pointerleave', hideTip);
  placeNode(n);
}
function placeNode(n) { n._g.setAttribute('transform', `translate(${n.x},${n.y})`); }
function dbClip(n) { }

// ---------------------------------------------------------------- build groups
function groupDepth(g) { const ch = groupList.filter(c => c.parent === g.id); return ch.length ? 1 + Math.max(...ch.map(groupDepth)) : 0; }
function groupMembers(g, acc = new Set()) {
  nodeList.forEach(n => { if (n.group === g.id) acc.add(n); });
  groupList.forEach(c => { if (c.parent === g.id) groupMembers(c, acc); });
  return acc;
}
function buildGroups() {
  groupList.forEach(g => {
    const el = svg('g', { class: 'group' + (g.style === 'solid' ? ' solid' : ''), 'data-id': g.id }, gLayer);
    if (g.color) el.style.setProperty('--gc', g.color);
    g._el = el; g._box = svg('rect', { class: 'gbox', rx: 14 }, el);
    g._head = svg('rect', { class: 'ghead', rx: 14, height: 34 }, el);
    g._title = svg('text', { class: 'gtitle' }, el);
    g._full = (g.label || g.id);
    g._head.addEventListener('pointerdown', ev => startGroupDrag(ev, g));
    g._head.addEventListener('pointerenter', ev => g._trunc && showTip(ev, `<b>${esc(g._full)}</b>`));
    g._head.addEventListener('pointermove', moveTip); g._head.addEventListener('pointerleave', hideTip);
  });
}
function updateGroups() {
  groupList.slice().sort((a, b) => groupDepth(b) - groupDepth(a)).forEach(g => {
    const mem = groupMembers(g); if (!mem.size) { g._el.style.display = 'none'; return; }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    mem.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + n.h); });
    groupList.forEach(c => { if (c.parent === g.id && c._r) { x0 = Math.min(x0, c._r.x); y0 = Math.min(y0, c._r.y); x1 = Math.max(x1, c._r.x + c._r.w); y1 = Math.max(y1, c._r.y + c._r.h); } });
    const pad = 24 + 14 * groupDepth(g), top = 20 * TS;
    g._r = { x: x0 - pad, y: y0 - pad - top, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 + top };
    g._box.setAttribute('x', g._r.x); g._box.setAttribute('y', g._r.y); g._box.setAttribute('width', g._r.w); g._box.setAttribute('height', g._r.h);
    g._head.setAttribute('x', g._r.x); g._head.setAttribute('y', g._r.y); g._head.setAttribute('width', g._r.w);
    const t = ellipsize(g._full.toUpperCase(), g._r.w - 28, '600 ' + (11 * TS) + 'px ' + FONT); g._trunc = t !== g._full.toUpperCase();
    g._title.setAttribute('x', g._r.x + 14); g._title.setAttribute('y', g._r.y + 14 + 7 * TS); g._title.textContent = t;
    g._el.style.display = '';
  });
}

// ---------------------------------------------------------------- edges
const vec = { R: [1, 0], L: [-1, 0], B: [0, 1], T: [0, -1] };
function sidePt(n, s, off) {
  const c = cxy(n);
  return s === 'R' ? { x: n.x + n.w, y: c.y + off } : s === 'L' ? { x: n.x, y: c.y + off } : s === 'B' ? { x: c.x + off, y: n.y + n.h } : { x: c.x + off, y: n.y };
}
function geometry() {
  const sm = {};
  edges.forEach(e => {
    const A = nodes[e.from], B = nodes[e.to], a = cxy(A), b = cxy(B), dx = b.x - a.x, dy = b.y - a.y;
    const LY = S.layout, layered = LY.mode !== 'radial', TBd = LY.direction === 'TB';
    const horizontal = layered && !TBd && Math.abs(dx) > 24 ? true : layered && TBd && Math.abs(dy) > 24 ? false : Math.abs(dx) / ((A.w + B.w) / 2) >= Math.abs(dy) / ((A.h + B.h) / 2);
    if (horizontal) { e._sa = dx >= 0 ? 'R' : 'L'; e._sb = dx >= 0 ? 'L' : 'R'; }
    else { e._sa = dy >= 0 ? 'B' : 'T'; e._sb = dy >= 0 ? 'T' : 'B'; }
    (sm[e.from + '|' + e._sa] = sm[e.from + '|' + e._sa] || []).push({ e, end: 'a' });
    (sm[e.to + '|' + e._sb] = sm[e.to + '|' + e._sb] || []).push({ e, end: 'b' });
  });
  for (const key in sm) {
    const [id, side] = key.split('|'), N = nodes[id], list = sm[key], horiz = side === 'L' || side === 'R';
    list.sort((p, q) => { const o = it => { const c = cxy(nodes[it.end === 'a' ? it.e.to : it.e.from]); return horiz ? c.y : c.x; }; return o(p) - o(q); });
    const len = horiz ? N.h : N.w, step = Math.min(28, len * .7 / Math.max(1, list.length - 1));
    list.forEach((it, i) => { it.e['_p' + it.end] = sidePt(N, side, (i - (list.length - 1) / 2) * step); });
  }
  edges.forEach(e => {
    const p = e._pa, q = e._pb, dist = Math.hypot(q.x - p.x, q.y - p.y), k = clamp(dist * .45, 40, 170), va = vec[e._sa], vb = vec[e._sb];
    e._d = `M${p.x},${p.y} C${p.x + va[0] * k},${p.y + va[1] * k} ${q.x + vb[0] * k},${q.y + vb[1] * k} ${q.x},${q.y}`;
  });
}
let edgeNo = 0;
function buildEdges() {
  const pairs = {};
  edges.forEach(e => { const k = [e.from, e.to].sort().join('|'); (pairs[k] = pairs[k] || []).push(e); });
  Object.values(pairs).forEach(l => { if (l.length > 1) l.forEach((e, i) => { const f = .5 + (i - (l.length - 1) / 2) * .28; e._lf = e.from < e.to ? f : 1 - f; }); });
  edges.forEach(e => {
    const c = e.color || null;
    const g = svg('g', { class: 'edge-g' }, eLayer); e._gEl = g;
    const eg = svg('g', { class: 'edge ' + (e.kind === 'async' || e.dashed ? 'async' : 'sync') }, g); e._eg = eg;
    e._hit = svg('path', { class: 'hit' }, eg);
    e._line = svg('path', { class: 'line', 'marker-end': 'url(#arrow)' }, eg);
    if (e.bidirectional) e._line.setAttribute('marker-start', 'url(#arrow)');
    if (c) e._line.style.stroke = c;
    e._hit.addEventListener('pointerenter', ev => showEdgeTip(e, ev)); e._hit.addEventListener('pointermove', moveTip); e._hit.addEventListener('pointerleave', hideTip);
    if (e.label) {
      const lg = svg('g', { class: 'elabel' }, lLayer); e._lg = lg;
      const full = e.label, short = tw(full, (11 * TS) + 'px ' + FONT) > 120 * TS;
      if (short) {
        e._no = ++edgeNo; legendEdges.push(e);
        svg('circle', { class: 'badge', r: 9 * TS }, lg); const t = svg('text', { class: 'badge-t', y: 3.8 * TS }, lg); t.textContent = e._no;
      } else {
        const w = tw(full, (11 * TS) + 'px ' + FONT) + 16;
        svg('rect', { class: 'pill', x: -w / 2, y: -9 * TS, width: w, height: 18 * TS, rx: 9 * TS }, lg);
        const t = svg('text', { y: 3.8 * TS }, lg); t.textContent = full;
      }
      lg.style.pointerEvents = 'none';
    }
  });
}
function updateEdges(only) {
  edges.forEach(e => {
    if (only && !only.has(e.from) && !only.has(e.to)) return;
    e._hit.setAttribute('d', e._d); e._line.setAttribute('d', e._d);
    e._len = e._line.getTotalLength();
    if (e._lg) { const m = e._line.getPointAtLength(e._len * (e._lf || .5)); e._lg.setAttribute('transform', `translate(${m.x},${m.y})`); }
    (e._steps || []).forEach(s => { s._trail.setAttribute('d', e._d); s._len = e._len; });
  });
}

// ---------------------------------------------------------------- timeline
const STEP_GAP = .45, SCENE_GAP = 1.0, LEAD = .8, FADE = 1.1;
const sceneList = S.scenes.map((s, i) => Object.assign({ i, steps: [] }, s));
const flat = [];
let T = 1;
function words(s) { return s ? String(s).trim().split(/\s+/).length : 0; }
function stepText(s) {
  if (s.caption) return s.caption;
  if (s._e) return `${nodes[s._e.from].label || s._e.from} → ${nodes[s._e.to].label || s._e.to}` + (s.payload ? ` · ${s.payload}` : (s._e.label ? ` · ${s._e.label}` : ''));
  if (s.node) return nodes[s.node] ? (nodes[s.node].label || s.node) : '';
  return '';
}
function buildTimeline() {
  const pace = 1 / (S.pace || 1);
  let cur = LEAD;
  sceneList.forEach(sc => {
    sc.start = cur; let maxEnd = 0, prevStart = 0;
    sc.steps.forEach((s, k) => {
      if (s.edge) { s._e = resolveEdge(s.edge); if (!s._e) { s._bad = true; } }
      let dur = s.dur != null ? s.dur : s._e ? clamp(.9 + (s._e._len || 300) / 560, 1.1, 2.5) * pace : s.node ? .9 * pace : Math.max(1.6, words(s.caption) / 3.2) * pace;
      const hold = s.hold != null ? s.hold : clamp(words(s.caption) / 3.4 - dur, 0, 3.2) * (pace);
      const start = (s.parallel && k > 0) ? prevStart + (s.delay || 0) : (k === 0 ? .25 : maxEnd + STEP_GAP) + (s.delay || 0);
      s._dur = dur; s._hold = hold; s._t0 = sc.start + start; s._t1 = s._t0 + dur; s._sc = sc.i; s._k = k;
      prevStart = start; maxEnd = Math.max(maxEnd, start + dur + hold);
      flat.push(s);
    });
    sc.end = sc.start + maxEnd + .5; cur = sc.end + SCENE_GAP;
  });
  T = Math.max(1, (sceneList.length ? sceneList[sceneList.length - 1].end : 2) + .6);
  flat.sort((a, b) => a._t0 - b._t0 || a._sc - b._sc || a._k - b._k);
}
// per-node effect tracks, computed from the step list
function buildEffects() {
  nodeList.forEach(n => { n._fillEv = []; n._pulses = []; n._chips = []; n._fill0 = clamp(n.fill || 0, 0, 1); (n.queue || []).forEach((m, i) => n._chips.push({ label: String(m), color: msgColor(m) || PALETTE[i % PALETTE.length], tIn: -9, tOut: Infinity })); });
  const evs = [];
  flat.forEach((s, idx) => {
    if (s._bad) return;
    if (s._e) {
      const f = nodes[s._e.from], t = nodes[s._e.to], key = s.msg || s.payload || null;
      s._key = key;
      if (f.kind === 'queue' && s.dequeue !== false) evs.push({ t: s._t0, type: 'deq', node: f, step: s, idx });
      if (t.kind === 'queue' && s.enqueue !== false) evs.push({ t: s._t1, type: 'enq', node: t, step: s, idx, label: key || '' });
      f._pulses.push({ t0: s._t0, t1: s._t0 + .55, a: .45 }); t._pulses.push({ t0: s._t1, t1: s._t1 + .9, a: 1 });
      if (s.fillTo != null || s.fillBy != null) evs.push({ t: s._t1, type: 'fill', node: nodes[s.fillNode] || t, to: s.fillTo, by: s.fillBy, idx });
    } else if (s.node && nodes[s.node]) {
      const n = nodes[s.node]; s._key = s.msg || null;
      n._pulses.push({ t0: s._t0, t1: s._t1 + .4, a: 1 });
      if (s.enqueue) evs.push({ t: s._t0, type: 'enq', node: n, step: s, idx, label: typeof s.enqueue === 'string' ? s.enqueue : (s.msg || '') });
      if (s.dequeue) evs.push({ t: s._t0, type: 'deq', node: n, step: s, idx });
      if (s.fillTo != null || s.fillBy != null) evs.push({ t: s._t0, type: 'fill', node: n, to: s.fillTo, by: s.fillBy, idx });
    }
  });
  evs.sort((a, b) => a.t - b.t || a.idx - b.idx);
  const cur = {}; nodeList.forEach(n => cur[n.id] = n._fill0);
  evs.forEach(ev => {
    const n = ev.node;
    if (ev.type === 'fill') {
      const to = clamp(ev.to != null ? ev.to : cur[n.id] + ev.by, 0, 1);
      n._fillEv.push({ t0: ev.t, t1: ev.t + .9, from: cur[n.id], to }); cur[n.id] = to;
    } else if (ev.type === 'enq') {
      const color = msgColor(ev.label) || PALETTE[(n._chips.length) % PALETTE.length];
      n._chips.push({ label: ev.label, color, tIn: ev.t, tOut: Infinity });
    } else if (ev.type === 'deq') {
      const c = n._chips.find(c => c.tOut === Infinity && c.tIn <= ev.t + 1e-6);
      if (c) { c.tOut = ev.t; ev.step._chipColor = c.color; if (!ev.step._key && c.label) ev.step._key = c.label; }
    }
  });
}
function buildStepViews() {
  edges.forEach(e => e._steps = []);
  flat.forEach(s => {
    if (!s._e) return;
    const col = s._chipColor || msgColor(s._key) || s._e.color || PALETTE[0];
    s._col = col;
    s._trail = svg('path', { class: 'trail', stroke: col }, tLayer);
    const pg = svg('g', { style: 'display:none' }, pLayer);
    s._halo = svg('circle', { r: 11, fill: col, class: 'pt-halo' }, pg);
    s._dot = svg('circle', { r: 5.5, fill: col, stroke: '#fff', 'stroke-width': 1.5 }, pg);
    const lab = s.payload || s.msg || '';
    if (lab) {
      const pf = '500 ' + (11 * TS) + 'px ' + FONT, txt = ellipsize(lab, 150 * TS, pf), w = tw(txt, pf) + 14;
      s._chipG = svg('g', { class: 'pt-chip' }, pg);
      svg('rect', { x: -w / 2, y: -30 - 9 * (TS - 1), width: w, height: 18 * TS, rx: 9 * TS, stroke: col }, s._chipG);
      const t = svg('text', { y: -17.4 - 2 * (TS - 1) }, s._chipG); t.textContent = txt;
      if (txt !== lab) s._truncPayload = true;
    }
    s._pg = pg; s._e._steps.push(s);
  });
}

// ---------------------------------------------------------------- view / pan / zoom
const view = { k: 1, x: 0, y: 0 }; let userMoved = false;
function applyView() {
  vp.setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`);
  pat.setAttribute('patternTransform', `translate(${view.x},${view.y}) scale(${view.k})`);
}
function bounds() {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  nodeList.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + n.h); });
  groupList.forEach(g => { if (g._r && g._el.style.display !== 'none') { x0 = Math.min(x0, g._r.x); y0 = Math.min(y0, g._r.y); x1 = Math.max(x1, g._r.x + g._r.w); y1 = Math.max(y1, g._r.y + g._r.h); } });
  return { x0, y0, x1, y1 };
}
function areaRect() {
  const W = innerWidth, H = innerHeight;
  const right = (!panel.classList.contains('hidden') ? 360 : 0), top = 60, bottom = 130 + (ctrlOn ? 40 : 0), left = 16 + (!legend.classList.contains('hidden') ? 316 : 0);
  return { left, top, aw: W - right - left - 24, ah: H - top - bottom };
}
function fitRect(b, pad, kmin, kmax) {
  const A = areaRect();
  const k = clamp(Math.min(A.aw / (b.x1 - b.x0 + pad), A.ah / (b.y1 - b.y0 + pad)), kmin, kmax);
  return { k, x: A.left + 12 + (A.aw - (b.x1 - b.x0) * k) / 2 - b.x0 * k, y: A.top + (A.ah - (b.y1 - b.y0) * k) / 2 - b.y0 * k };
}
function fitView(animate) {
  const v = fitRect(bounds(), 40, .15, 1.8);
  if (animate) tweenView(v); else { view.k = v.k; view.x = v.x; view.y = v.y; applyView(); }
  userMoved = false;
}
let camFollow = false, lastCamKey = null, lastCamScene = -2;
function boundsOf(set) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  set.forEach(id => { const n = nodes[id]; if (!n) return; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + n.h); });
  return { x0, y0, x1, y1 };
}
function stepNodes(s) { const set = new Set(); if (s._e) { set.add(s._e.from); set.add(s._e.to); } if (s.node) set.add(s.node); (s.focus || []).forEach(x => set.add(x)); return set; }
function sceneNodeSet(sc) { const set = new Set(); sc.steps.forEach(s => stepNodes(s).forEach(x => set.add(x))); (sc.focus || []).forEach(x => set.add(x)); return set; }
// a scene is framed as a whole if that keeps text readable (zoom >= MIN_K); otherwise the camera follows each step
function sceneGran(sc) { const set = sceneNodeSet(sc); if (!set.size) return 'scene'; return fitRect(boundsOf(set), 160, .1, 9).k >= MIN_K ? 'scene' : 'step'; }
function stepIdxAtCam(sc, t) { let cur = 0; sc.steps.forEach((s, k) => { if (s._t0 - .45 <= t) cur = k; }); return cur; }
function camKey() {
  const si = st.scene < 0 ? 0 : st.scene, sc = sceneList[si];
  if (!sc) return 'all';
  return sceneGran(sc) === 'step' ? si + ':' + stepIdxAtCam(sc, st.t) : String(si);
}
function camTarget(key) {
  if (key === 'all') return fitRect(bounds(), 40, .15, 1.8);
  const [si, k] = key.split(':'), sc = sceneList[+si];
  if (k == null) return fitRect(boundsOf(sceneNodeSet(sc)), 160, MIN_K, 1.35);
  const stp = sc.steps[+k], set = stepNodes(stp); if (!set.size) sceneNodeSet(sc).forEach(x => set.add(x));
  return fitRect(boundsOf(set), 200, .75, 1.2);
}
function camTick() {
  if (!camFollow || !inited) return;
  const key = camKey(), sc = st.scene;
  if (userMoved && sc !== lastCamScene && lastCamScene !== -2) userMoved = false;   // a new scene takes the camera back
  lastCamScene = sc;
  if (key === lastCamKey || userMoved) return;
  const first = lastCamKey === null; lastCamKey = key;
  const v = camTarget(key);
  if (first) { view.k = v.k; view.x = v.x; view.y = v.y; applyView(); } else tweenView(v, key.includes(':') ? 800 : 1000);
}
function camReset() { lastCamKey = null; if (camFollow && !userMoved) camTick(); else if (!camFollow && !userMoved) fitView(false); }
function refit(animate) { if (camFollow) { lastCamKey = null; userMoved = false; camTick(); } else fitView(animate); }
let tweening = null;
function tweenView(to, ms) {
  const from = { ...view }, t0 = performance.now(), A = areaRect(), px = A.left + 12 + A.aw / 2, py = A.top + A.ah / 2;
  ms = ms || 650; cancelAnimationFrame(tweening);
  const c0 = { x: (px - from.x) / from.k, y: (py - from.y) / from.k }, c1 = { x: (px - to.x) / to.k, y: (py - to.y) / to.k };
  const dist = Math.hypot(c1.x - c0.x, c1.y - c0.y) * Math.max(from.k, to.k);
  const dip = clamp(dist / (.9 * Math.min(A.aw, A.ah)), 0, 1) * .38;     // zoom out a little while travelling a long way, then back in
  const step = now => {
    const p = clamp((now - t0) / ms, 0, 1), e = ease(p), k = lerp(from.k, to.k, e) * (1 - dip * Math.sin(Math.PI * e));
    const cx = lerp(c0.x, c1.x, e), cy = lerp(c0.y, c1.y, e);
    view.k = k; view.x = px - cx * k; view.y = py - cy * k; applyView();
    if (p < 1) tweening = requestAnimationFrame(step);
  };
  tweening = requestAnimationFrame(step);
}
stage.addEventListener('wheel', ev => {
  ev.preventDefault(); userMoved = true; cancelAnimationFrame(tweening);
  const f = Math.exp(-ev.deltaY * (ev.ctrlKey ? .01 : .0016)), k2 = clamp(view.k * f, .12, 3.5), r = k2 / view.k;
  view.x = ev.clientX - (ev.clientX - view.x) * r; view.y = ev.clientY - (ev.clientY - view.y) * r; view.k = k2; applyView();
}, { passive: false });
let drag = null;
stage.addEventListener('pointerdown', ev => {
  if (ev.target !== stage && ev.target !== bgRect) return;
  drag = { type: 'pan', sx: ev.clientX, sy: ev.clientY, vx: view.x, vy: view.y, moved: false };
  stage.setPointerCapture(ev.pointerId); stage.classList.add('panning'); hideTip();
});
stage.addEventListener('dblclick', ev => { if (ev.target === stage || ev.target === bgRect) fitView(true); });
function toWorld(ev) { return { x: (ev.clientX - view.x) / view.k, y: (ev.clientY - view.y) / view.k }; }
function startNodeDrag(ev, n) {
  ev.stopPropagation(); const w = toWorld(ev);
  drag = { type: 'node', n, ox: w.x - n.x, oy: w.y - n.y, sx: ev.clientX, sy: ev.clientY, moved: false };
  stage.setPointerCapture(ev.pointerId); hideTip();
}
function startGroupDrag(ev, g) {
  ev.stopPropagation(); const w = toWorld(ev), mem = [...groupMembers(g)];
  drag = { type: 'group', mem, start: mem.map(n => ({ n, x: n.x, y: n.y })), wx: w.x, wy: w.y, sx: ev.clientX, sy: ev.clientY, moved: false };
  stage.setPointerCapture(ev.pointerId); hideTip();
}
stage.addEventListener('pointermove', ev => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) < 4) return;
  drag.moved = true;
  if (drag.type === 'pan') { userMoved = true; view.x = drag.vx + ev.clientX - drag.sx; view.y = drag.vy + ev.clientY - drag.sy; applyView(); }
  else if (drag.type === 'node') { const w = toWorld(ev); drag.n.x = Math.round(w.x - drag.ox); drag.n.y = Math.round(w.y - drag.oy); relayoutAround([drag.n]); }
  else { const w = toWorld(ev), dx = w.x - drag.wx, dy = w.y - drag.wy; drag.start.forEach(s => { s.n.x = Math.round(s.x + dx); s.n.y = Math.round(s.y + dy); }); relayoutAround(drag.mem); }
});
stage.addEventListener('pointerup', ev => {
  if (!drag) return;
  const d = drag; drag = null; stage.classList.remove('panning');
  if (d.type === 'node') { if (!d.moved) select(d.n.id); else saveLayout(); }
  else if (d.type === 'group' && d.moved) saveLayout();
  else if (d.type === 'pan' && !d.moved) select(null);
  render(true);
});
function relayoutAround(list) {
  const ids = new Set(list.map(n => n.id));
  list.forEach(n => { placeNode(n); dbClip(n); });
  geometry(); updateEdges(); updateGroups(); render(true);
}
const LS_KEY = 'fds-layout:' + (S.id || S.title);
function saveLayout() { try { const o = {}; nodeList.forEach(n => { const c = cxy(n); o[n.id] = [c.x / BS, c.y / BS]; }); localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) { } }
function loadLayout() { try { const o = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); if (o) nodeList.forEach(n => { if (o[n.id]) { n.x = o[n.id][0] * BS - n.w / 2; n.y = o[n.id][1] * BS - n.h / 2; } }); return !!o; } catch (e) { return false; } }
function resetLayout() {
  try { localStorage.removeItem(LS_KEY); } catch (e) { }
  nodeList.forEach(n => { const sp = SPEC.nodes.find(s => s.id === n.id); n.x = sp.x != null ? sp.x * BS : undefined; n.y = sp.y != null ? sp.y * BS : undefined; });
  layoutAuto(); nodeList.forEach(placeNode); geometry(); updateEdges(); updateGroups(); fitView(true); render(true);
}

// ---------------------------------------------------------------- tooltip
const tip = h('div', { id: 'tooltip' }); root.appendChild(tip);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function showTip(ev, htmlStr) { tip.innerHTML = htmlStr; tip.classList.add('show'); moveTip(ev); }
function moveTip(ev) {
  const r = tip.getBoundingClientRect(); let x = ev.clientX + 14, y = ev.clientY + 16;
  if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function hideTip() { tip.classList.remove('show'); }
function showNodeTip(n, ev) {
  if (drag) return;
  let m = `<b>${esc(n.label || n.id)}</b><div class="k">${esc(n.k.name)}${n.tech ? ' · ' + esc(n.tech) : ''}</div>`;
  if (n.description) m += `<div>${esc(n.description)}</div>`;
  if (n.kind === 'database' || n.kind === 'storage') m += `<div class="k">Filled ${Math.round(curFill(n, st.t) * 100)}%</div>`;
  if (n.kind === 'queue') m += `<div class="k">${queueLen(n, st.t)} message(s) waiting</div>`;
  showTip(ev, m);
}
function showEdgeTip(e, ev) {
  if (drag) return;
  const A = nodes[e.from], B = nodes[e.to];
  let m = `<b>${esc(e.label || (A.label || A.id) + ' → ' + (B.label || B.id))}</b><div class="k">${esc(A.label || A.id)} → ${esc(B.label || B.id)}${e.protocol ? ' · ' + esc(e.protocol) : ''}${e.kind === 'async' ? ' · async' : ''}</div>`;
  if (e.description) m += `<div>${esc(e.description)}</div>`;
  showTip(ev, m);
}

// ---------------------------------------------------------------- state & rendering
const st = { t: 0, playing: false, speedIdx: 3, mode: S.mode === 'timeline' ? 'timeline' : 'scenes', slow: false, fast: false, until: null, sel: null, scene: -1, step: null, sceneEnded: false };
const sceneAt = t => { let r = -1; sceneList.forEach(s => { if (t >= s.start - 1e-6) r = s.i; }); return r; };
function curFill(n, t) {
  let v = n._fill0;
  for (const e of n._fillEv) { if (t >= e.t1) v = e.to; else { if (t > e.t0) v = lerp(e.from, e.to, ease((t - e.t0) / (e.t1 - e.t0))); else v = e.from; break; } }
  return v;
}
function chipState(n, t) {
  const out = []; let ahead = 0;
  for (const c of n._chips) {
    const pin = clamp((t - c.tIn) / .45, 0, 1), pout = c.tOut === Infinity ? 0 : clamp((t - c.tOut) / .45, 0, 1);
    if (pin <= 0) continue;
    out.push({ c, slot: ahead, pin, pout });
    ahead += (1 - ease(pout));
  }
  return out;
}
const queueLen = (n, t) => chipState(n, t).filter(s => s.pout < 1).length;
const edgeActive = new Map();
function render(force) {
  const t = st.t;
  // scene focus
  const sc = sceneAt(t);
  if (sc !== st.scene || force === 'scene') { st.scene = sc; applyFocus(); updatePanelScene(); }
  // edges
  edges.forEach(e => {
    let on = false;
    for (const s of e._steps) {
      const p = clamp((t - s._t0) / (s._t1 - s._t0), 0, 1);
      if (t < s._t0) { s._trail.style.opacity = 0; s._pg.style.display = 'none'; continue; }
      const pe = ease(p), L = e._len || 1;
      s._trail.setAttribute('stroke-dasharray', `${pe * L} ${L * 2}`);
      const fade = t <= s._t1 ? 1 : clamp(1 - (t - s._t1) / FADE, 0, 1);
      s._trail.style.opacity = s.persist ? 1 : fade;
      if (t <= s._t1 + .02) {
        on = true;
        const pt = e._line.getPointAtLength(pe * L);
        s._pg.style.display = ''; s._pg.setAttribute('transform', `translate(${pt.x},${pt.y})`);
        const bob = 1 + .12 * Math.sin(t * 9); s._halo.setAttribute('r', 10 * bob);
      } else s._pg.style.display = 'none';
      if (t > s._t1 && t < s._t1 + .35) on = true;
    }
    if (on !== e._on) { e._on = on; e._eg.classList.toggle('active', on); if (!on) e._line.removeAttribute('stroke-dashoffset'); }
    if (on) e._line.setAttribute('stroke-dashoffset', (-t * 38).toFixed(1));
  });
  // nodes
  nodeList.forEach(n => {
    let a = 0, q = 0;
    for (const p of n._pulses) if (t >= p.t0 && t <= p.t1) { const pp = (t - p.t0) / (p.t1 - p.t0); if (1 - pp > a) { a = (1 - pp) * p.a; q = pp; } }
    if (a > 0.01) {
      if (!n._pulseEl) n._pulseEl = n._pulseShape();
      const k = 1 + q * .1, ox = n.w0 * (k - 1) / 2, oy = n.h0 * (k - 1) / 2;
      n._pulseEl.setAttribute('transform', `translate(${-ox},${-oy}) scale(${k})`);
      n._pulseEl.style.opacity = a; n._pulseEl.style.display = '';
      n._body.style.filter = `drop-shadow(0 0 ${6 * a}px color-mix(in srgb,${n.color} 70%,transparent))`;
    } else if (n._pulseEl && n._pulseEl.style.display !== 'none') { n._pulseEl.style.display = 'none'; n._body.style.filter = ''; }
    if (n._parts.level) {
      const f = curFill(n, t), y = n.h0 - 9 - f * (n.h0 - 18);
      n._parts.level.setAttribute('y', y); n._parts.level.setAttribute('height', Math.max(0, n.h0 - y));
      n._parts.levelline.setAttribute('y1', y); n._parts.levelline.setAttribute('y2', y); n._parts.levelline.style.opacity = f > .01 ? .7 : 0;
      n._parts.pct.textContent = f > .005 ? Math.round(f * 100) + '%' : '';
    }
    if (n._chipLayer) renderChips(n, t);
  });
  camTick();
  updateUI();
}
function renderChips(n, t) {
  const L = n._chipLayer, cs = chipState(n, t), r = n._rail, cw = 32, ch = 15, slotW = 36;
  if (!n._chipEls) n._chipEls = new Map();
  const seen = new Set(); let hidden = 0;
  cs.forEach(s => {
    seen.add(s.c);
    let el = n._chipEls.get(s.c);
    if (!el) { el = svg('g', { class: 'chip-m' }, L); svg('rect', { width: cw, height: ch, rx: 4, fill: s.c.color }, el); const tx = svg('text', { x: cw / 2, y: 10.8 }, el); tx.textContent = (s.c.label || '').slice(0, 4); n._chipEls.set(s.c, el); }
    const alpha = ease(s.pin) * (1 - ease(s.pout));
    const slot = s.slot;
    if (alpha <= 0.01 || slot > n._slots - 1 + .01) { el.style.display = 'none'; if (alpha > .01 && slot > n._slots - 1) hidden++; return; }
    const x = r.x + r.w - 5 - cw - slot * slotW + (1 - ease(s.pin)) * -26 + ease(s.pout) * 26;
    el.style.display = ''; el.setAttribute('transform', `translate(${x},${r.y + (r.h - ch) / 2})`); el.style.opacity = alpha;
  });
  n._chipEls.forEach((el, c) => { if (!seen.has(c)) el.style.display = 'none'; });
  n._parts.more.textContent = hidden ? '+' + hidden : '';
}
function applyFocus() {
  const sc = sceneList[st.scene];
  const set = new Set(), eset = new Set();
  if (sc && S.focus !== false) {
    sc.steps.forEach(s => { if (s._e) { set.add(s._e.from); set.add(s._e.to); eset.add(s._e.id); } if (s.node) set.add(s.node); if (s.focus) s.focus.forEach(x => set.add(x)); });
    (sc.focus || []).forEach(x => set.add(x));
  }
  const on = sc && S.focus !== false && set.size > 0;
  nodeList.forEach(n => n._g.classList.toggle('dim', on && !set.has(n.id)));
  edges.forEach(e => { const d = on && !eset.has(e.id); e._gEl.classList.toggle('dim', d); if (e._lg) e._lg.classList.toggle('dim', d); });
}
function select(id) {
  st.sel = id;
  nodeList.forEach(n => n._g.classList.toggle('selected', n.id === id));
  edges.forEach(e => e._eg.classList.toggle('hl', !!id && (e.from === id || e.to === id)));
  updateSelCard();
}

// ---------------------------------------------------------------- UI: appbar / panel / controls / legend / help
const appbar = h('div', { id: 'appbar' }, h('h1', { text: S.title }), h('span', { class: 'chip primary type', text: TYPE_NAMES[S.type] || S.type }), h('div', { class: 'grow' }));
function ib(path, tip, fn, cls) { const b = h('button', { class: 'ibtn ' + (cls || ''), 'aria-label': tip, onclick: fn }); b.appendChild(icon(path)); b._tip = tip; b.addEventListener('pointerenter', ev => showTip(ev, esc(b._tip))); b.addEventListener('pointermove', moveTip); b.addEventListener('pointerleave', hideTip); b.addEventListener('click', hideTip); return b; }
const keyLabel = a => { const k = KEYMAP[a][0]; return k === ' ' || k === 'Space' ? 'Space' : k.replace('Arrow', '').replace(/^([a-z])$/, m => m.toUpperCase()); };
const bLegend = ib(MUI.info, 'Legend (L)', () => doAction('toggleLegend')), bPanel = ib(MUI.list, 'Story panel (P)', () => doAction('togglePanel')),
  bFit = ib(MUI.fit, 'Fit to screen (F) · double-click background', () => doAction('fit')), bTheme = ib(MUI.moon, 'Light / dark (T)', () => doAction('toggleTheme')),
  bCtrl = ib(MUI.tune, 'Playback controls (C)', () => doAction('toggleControls')), bHelp = ib(MUI.kbd, 'Keyboard shortcuts (?)', () => doAction('toggleHelp')),
  bReset = ib(MUI.reset, 'Reset layout', resetLayout), bSize = ib(MUI.size, 'Text & component size (+ / −)', () => doAction('toggleSize'));
[bReset, bSize, bLegend, bPanel, bFit, bTheme, bCtrl, bHelp].forEach(b => appbar.appendChild(b));
root.appendChild(appbar);

const panel = h('aside', { id: 'panel', class: 'paper elev8' }); root.appendChild(panel);
const panelBody = h('div', { class: 'body' });
panel.append(h('header', null, h('b', { text: 'Story' }), h('span', { class: 'chip', id: 'modeChip' }), (() => { const b = h('button', { class: 'ibtn', 'aria-label': 'Close', onclick: () => doAction('togglePanel') }); b.appendChild(icon(MUI.close)); return b; })()), panelBody);
const selHost = h('div'); panelBody.appendChild(selHost);
const sceneEls = [];
sceneList.forEach(sc => {
  const lis = sc.steps.map((s, k) => h('li', { onclick: () => replayStep(s) }, stepText(s)));
  const el = h('div', { class: 'scene' }, h('div', { class: 'sh', onclick: () => gotoScene(sc.i, true) }, h('div', { class: 'num', text: sc.i + 1 }), h('div', { class: 'st', text: sc.title || ('Scene ' + (sc.i + 1)) })),
    h('div', { class: 'sd' }, sc.text ? h('p', { text: sc.text }) : null, h('ol', null, lis)));
  el._lis = lis; sceneEls.push(el); panelBody.appendChild(el);
});
function updatePanelScene() { sceneEls.forEach((el, i) => el.classList.toggle('active', i === st.scene)); }
function updateSelCard() {
  selHost.innerHTML = ''; const n = nodes[st.sel]; if (!n) return;
  const ins = edges.filter(e => e.to === n.id).map(e => nodes[e.from].label || e.from), outs = edges.filter(e => e.from === n.id).map(e => nodes[e.to].label || e.to);
  selHost.appendChild(h('div', { class: 'sel-card' }, h('h3', { text: n.label || n.id }), h('span', { class: 'chip primary', text: n.k.name + (n.tech ? ' · ' + n.tech : '') }),
    n.description ? h('p', { text: n.description }) : null, ins.length ? h('p', { text: 'Receives from: ' + ins.join(', ') }) : null, outs.length ? h('p', { text: 'Sends to: ' + outs.join(', ') }) : null));
}

const caption = h('div', { id: 'caption', class: 'paper elev8 off' }, h('div', { class: 'ov' }), h('div', { class: 'tx' })); root.appendChild(caption);
const hint = h('div', { id: 'hint' }, h('span', { class: 'chip' }, h('span', { class: 'kbd', text: 'Space' }), ' play / pause'), h('span', { class: 'chip' }, h('span', { class: 'kbd', text: 'C' }), ' controls'), h('span', { class: 'chip' }, h('span', { class: 'kbd', text: '?' }), ' all keys'));
root.appendChild(hint);

const ctrl = h('div', { id: 'controls', class: 'paper elev8' }); root.appendChild(ctrl);
const bRestart = ib(MUI.replay, 'Restart (R)', () => doAction('restart')), bPrev = ib(MUI.prev, 'Previous scene (←)', () => doAction('prevScene')),
  bPlay = ib(MUI.play, 'Play / pause (Space)', () => doAction('playPause'), 'play'), bNext = ib(MUI.next, 'Next scene (→)', () => doAction('nextScene'));
const slider = h('input', { type: 'range', min: 0, max: 1000, value: 0, tabindex: -1, 'aria-label': 'Timeline' });
const ticks = h('div', { class: 'ticks' }); const timeEl = h('div', { class: 'time' });
slider.addEventListener('input', () => { st.until = null; st.sceneEnded = false; st.t = slider.value / 1000 * T; render(); });
slider.addEventListener('pointerup', () => slider.blur());
const spdMinus = h('button', { class: 'ibtn', tabindex: -1, onclick: () => doAction('speedDown'), 'aria-label': 'Slower', text: '−' }), spdPlus = h('button', { class: 'ibtn', tabindex: -1, onclick: () => doAction('speedUp'), 'aria-label': 'Faster', text: '+' });
spdMinus.style.fontSize = spdPlus.style.fontSize = '20px';
const spdChip = h('button', { class: 'chip btn', tabindex: -1, text: '1×', onclick: () => { st.speedIdx = 3; updateUI(); } });
const speedBox = h('div', { class: 'speed' }, spdMinus, spdChip, spdPlus);
const segScenes = h('button', { text: 'Scenes', tabindex: -1, onclick: () => setMode('scenes') }), segTimeline = h('button', { text: 'Timeline', tabindex: -1, onclick: () => setMode('timeline') });
const seg = h('div', { class: 'seg' }, segScenes, segTimeline);
ctrl.append(bRestart, bPrev, bPlay, bNext, h('div', { class: 'sl' }, slider, ticks), timeEl, speedBox, seg);
sceneList.forEach(sc => { ticks.appendChild(h('i', { style: `left:calc(${(sc.start / T) * 100}% )` })); });

const legend = h('div', { id: 'legend', class: 'paper elev8 hidden' }); root.appendChild(legend);
const help = h('div', { id: 'help' }); root.appendChild(help);
let ctrlOn = false;

function fmtKey(k) { return k === 'Space' || k === ' ' ? 'Space' : k.replace('Arrow', '') + (k.startsWith('Arrow') ? ' arrow' : ''); }
function buildHelp() {
  const rows = [['playPause', 'Play / pause'], ['prevScene', 'Previous scene'], ['nextScene', 'Next scene'], ['prevStep', 'Replay previous step'], ['nextStep', 'Play next step'], ['speedDown', 'Slower'], ['speedUp', 'Faster'], ['restart', 'Restart from the beginning'],
    ['toggleMode', 'Switch Scenes ↔ Timeline'], ['toggleControls', 'Show / hide playback controls'], ['togglePanel', 'Show / hide story panel'], ['toggleLegend', 'Show / hide legend'], ['fit', 'Fit whole diagram to screen'], ['toggleCamera', 'Auto camera: follow active scene / show all'], ['sizeUp', 'Bigger text and components'], ['sizeDown', 'Smaller text and components'], ['toggleSize', 'Size panel'], ['toggleTheme', 'Light / dark theme'], ['toggleHelp', 'This help']];
  const dlg = h('div', { class: 'dlg paper elev8' }, h('h2', { text: 'Keyboard shortcuts' }));
  const tb = h('table');
  rows.forEach(([a, label]) => tb.appendChild(h('tr', null, h('td', null, ...KEYMAP[a].flatMap((k, i) => i ? [' or ', h('span', { class: 'kbd', text: fmtKey(k) })] : [h('span', { class: 'kbd', text: fmtKey(k) })])), h('td', { text: label }))));
  tb.appendChild(h('tr', null, h('td', null, h('span', { class: 'kbd', text: 'hold ' + MOD_SLOW }), ' + any key'), h('td', { text: 'Slow motion while held (×' + SLOW_F + ')' })));
  tb.appendChild(h('tr', null, h('td', null, h('span', { class: 'kbd', text: 'hold ' + MOD_FAST })), h('td', { text: 'Fast forward while held (×' + FAST_F + ')' })));
  dlg.append(tb, h('div', { class: 'note', text: 'Mouse: drag background to pan · scroll or pinch to zoom · drag a component (or a group header) to rearrange · click a component to see its links · double-click background to fit. Hover anything for full names.' }));
  help.innerHTML = ''; help.appendChild(dlg); help.addEventListener('click', ev => { if (ev.target === help) doAction('toggleHelp'); });
}
function buildLegend() {
  const b = h('div', { class: 'body' }), used = [...new Set(nodeList.map(n => n.kind))];
  b.appendChild(h('h4', { text: 'Components' }));
  used.forEach(k => { const K = KIND[k] || KIND.service; const s = svg('svg', { width: 18, height: 18, viewBox: '0 0 24 24' }); svg('circle', { cx: 12, cy: 12, r: 11, fill: K.c, opacity: .16 }, s); const g = svg('g', { transform: 'translate(3.2,3.2) scale(.73)', fill: 'none', stroke: K.c, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s); if (K.ic) svg('path', { d: K.ic }, g); else { svg('ellipse', { cx: 12, cy: 6, rx: 8, ry: 3 }, g); svg('path', { d: 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6' }, g); } b.appendChild(h('div', { class: 'row' }, s, K.name)); });
  b.appendChild(h('h4', { text: 'Connections' }));
  const ln = (dash) => { const s = svg('svg', { width: 34, height: 14, viewBox: '0 0 34 14' }); svg('path', { d: 'M1 7H29', stroke: 'var(--edge)', 'stroke-width': 1.8, 'stroke-dasharray': dash || 'none', fill: 'none' }, s); svg('path', { d: 'M27 3l6 4-6 4z', fill: 'var(--edge)' }, s); return s; };
  if (edges.some(e => !(e.kind === 'async' || e.dashed))) b.appendChild(h('div', { class: 'row' }, ln(), 'Request / data flow (synchronous)'));
  if (edges.some(e => e.kind === 'async' || e.dashed)) b.appendChild(h('div', { class: 'row' }, ln('6 5'), 'Event / asynchronous message'));
  const dot = svg('svg', { width: 34, height: 14, viewBox: '0 0 34 14' }); svg('circle', { cx: 17, cy: 7, r: 5.5, fill: PALETTE[0], stroke: '#fff', 'stroke-width': 1.5 }, dot);
  b.appendChild(h('div', { class: 'row' }, dot, 'Colored dot = a message / record in flight'));
  if (nodeList.some(n => n.kind === 'database' || n.kind === 'storage')) b.appendChild(h('div', { class: 'row' }, '▮', 'Storage fills as data is written'));
  if (legendEdges.length) { b.appendChild(h('h4', { text: 'Numbered connections' })); legendEdges.forEach(e => b.appendChild(h('div', { class: 'row hov' }, h('span', { class: 'nb', text: e._no }), h('span', null, e.label, h('br'), h('span', { style: 'color:var(--text3);font-size:11.5px', text: (nodes[e.from].label || e.from) + ' → ' + (nodes[e.to].label || e.to) }))))); }
  if (legendTrunc.length) { b.appendChild(h('h4', { text: 'Shortened names' })); legendTrunc.forEach(n => b.appendChild(h('div', { class: 'row' }, h('span', null, n.label || n.id)))); }
  const hd = h('header', null, h('span', { class: 'grow', text: 'Legend' })); const cb = h('button', { class: 'ibtn', style: 'width:32px;height:32px', onclick: () => doAction('toggleLegend'), 'aria-label': 'Close' }); cb.appendChild(icon(MUI.close)); hd.appendChild(cb);
  legend.append(hd, b);
  if ((legendEdges.length || legendTrunc.length) && innerWidth >= 1500) legend.classList.remove('hidden');
}

function layoutOverlays() {
  const W = innerWidth, L = legend.classList.contains('hidden') ? 12 : 330, R = W - (panel.classList.contains('hidden') ? 12 : 354);
  const span = Math.max(300, R - L), cx = L + (R - L) / 2;
  [[caption, 720], [ctrl, 860]].forEach(([el, mx]) => { el.style.left = cx + 'px'; el.style.width = Math.min(mx, span) + 'px'; });
  hint.style.left = cx + 'px';
}
function fmtT(s) { s = Math.max(0, s); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); }
const speedMult = () => SPEEDS[st.speedIdx] * (st.slow ? SLOW_F : 1) * (st.fast ? FAST_F : 1);
let lastStep = null, lastCapText = '';
function updateUI() {
  const t = st.t;
  slider.value = Math.round(t / T * 1000); timeEl.textContent = fmtT(t) + ' / ' + fmtT(T);
  bPlay.firstChild.firstChild.setAttribute('d', st.playing ? MUI.pause : MUI.play);
  const m = speedMult(); spdChip.textContent = (+m.toFixed(2)) + '×'; spdChip.classList.toggle('mod', st.slow || st.fast);
  segScenes.classList.toggle('on', st.mode === 'scenes'); segTimeline.classList.toggle('on', st.mode === 'timeline');
  $('modeChip').textContent = st.mode === 'scenes' ? 'Scenes mode' : 'Timeline mode';
  bPanel.classList.toggle('on', !panel.classList.contains('hidden')); bLegend.classList.toggle('on', !legend.classList.contains('hidden')); bCtrl.classList.toggle('on', ctrlOn);
  // caption: the latest started step in the current scene
  let cur = null; for (const s of flat) { if (s._t0 <= t + 1e-6) cur = s; else break; }
  const sc = sceneList[st.scene];
  let txt = '', ov = '';
  if (cur && sc && cur._sc === sc.i && t <= sc.end + .3) { txt = stepText(cur); ov = `Scene ${sc.i + 1} · ${sc.title || ''}  —  step ${cur._k + 1}/${sc.steps.length}`; }
  else if (sc && t <= sc.start + .25) { txt = sc.text || ''; ov = `Scene ${sc.i + 1} · ${sc.title || ''}`; }
  if (st.sceneEnded && sc) { ov = `Scene ${sc.i + 1} complete`; txt = (cur && cur._sc === sc.i ? stepText(cur) : '') + (st.sceneEnded === 'last' ? '' : '   →  next scene'); }
  caption.classList.toggle('off', !txt);
  if (txt && txt !== lastCapText) { caption.firstChild.textContent = ov; caption.lastChild.textContent = txt; lastCapText = txt; }
  else if (txt) caption.firstChild.textContent = ov;
  if (cur !== lastStep) {
    lastStep = cur; sceneEls.forEach((el, i) => el._lis.forEach((li, k) => { const s = sceneList[i].steps[k]; li.classList.toggle('cur', s === cur); li.classList.toggle('done', s._t0 < (cur ? cur._t0 : -1) && i === (cur ? cur._sc : -1)); }));
    const lc = cur && sceneEls[cur._sc] && sceneEls[cur._sc]._lis[cur._k]; if (lc && !panel.classList.contains('hidden')) lc.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  hint.classList.toggle('off', ctrlOn || st.t > .01 && st.playing || st.t > 2);
  layoutOverlays();
  caption.style.bottom = ctrlOn ? '96px' : (hint.classList.contains('off') ? '24px' : '66px');
}
const $ = id => document.getElementById(id) || { classList: { toggle() { } }, textContent: '' };
panel.querySelector('.chip').id = 'modeChip';


// ---------------------------------------------------------------- size control (text / components)
function rebuildScene() {
  [gLayer, eLayer, lLayer, tLayer, nLayer, pLayer].forEach(l => l.replaceChildren());
  [...defs.querySelectorAll('clipPath')].forEach(c => c.remove());
  legendTrunc.length = 0; legendEdges.length = 0; edgeNo = 0;
  groupList.length && buildGroups();
  nodeList.forEach(n => { n._chipEls = null; n._pulseEl = null; buildNode(n); });
  edges.forEach(e => { e._on = false; });
  buildEdges(); geometry(); updateEdges(); updateGroups(); buildStepViews(); updateEdges();
  const wasHidden = legend.classList.contains('hidden'); legend.replaceChildren(); buildLegend(); legend.classList.toggle('hidden', wasHidden);
  setTheme(root.dataset.theme || 'light');
  applyFocus(); select(st.sel); lastCamKey = null; render(true);
}
function applySize(ts, bs) {
  ts = clamp(Math.round(ts * 100) / 100, .8, 2.2); bs = clamp(Math.round(bs * 100) / 100, .8, 2.2);
  if (ts === TS && bs === BS) return;
  const ratio = bs / BS;
  nodeList.forEach(n => { const c = cxy(n); n.w = n.w0 * bs; n.h = n.h0 * bs; n.x = c.x * ratio - n.w / 2; n.y = c.y * ratio - n.h / 2; });
  TS = ts; BS = bs; document.documentElement.style.setProperty('--ts', TS); document.documentElement.style.setProperty('--tsn', TS / BS);
  try { localStorage.setItem(SIZE_KEY, JSON.stringify([TS, BS])); } catch (e) { }
  rebuildScene(); camReset(); sizeSync();
}
const sizeBox = h('div', { id: 'sizebox', class: 'paper elev8' }); root.appendChild(sizeBox);
const tsIn = h('input', { type: 'range', min: 80, max: 220, step: 5, tabindex: -1 }), bsIn = h('input', { type: 'range', min: 80, max: 220, step: 5, tabindex: -1 });
const tsLab = h('span'), bsLab = h('span');
sizeBox.append(h('h3', { text: 'Size' }), h('label', null, 'Text', tsLab), tsIn, h('label', null, 'Components (boxes, shapes)', bsLab), bsIn,
  h('div', { class: 'foot' }, h('span', null, h('span', { class: 'kbd', text: '+' }), ' ', h('span', { class: 'kbd', text: '−' }), ' both'), h('button', { class: 'chip btn', text: 'Reset', onclick: () => applySize(1, 1) })));
[tsIn, bsIn].forEach(i => { i.addEventListener('change', () => { applySize(tsIn.value / 100, bsIn.value / 100); i.blur(); }); i.addEventListener('input', () => { tsLab.textContent = tsIn.value + '%'; bsLab.textContent = bsIn.value + '%'; }); });
function sizeSync() { tsIn.value = Math.round(TS * 100); bsIn.value = Math.round(BS * 100); tsLab.textContent = tsIn.value + '%'; bsLab.textContent = bsIn.value + '%'; }
sizeSync();

// ---------------------------------------------------------------- actions
function setMode(m) { st.mode = m; st.sceneEnded = false; updateUI(); }
function play() {
  if (st.playing) return;
  const sc = sceneList[st.scene];
  if (st.mode === 'scenes' && sc && st.t >= sc.end - .01) { const nx = sceneList[sc.i + 1]; if (nx) st.t = nx.start; else st.t = 0; }
  else if (st.t >= T - .01) st.t = 0;
  st.sceneEnded = false; st.playing = true; last = performance.now(); loop();
}
function pause() { st.playing = false; st.until = null; }
function gotoScene(i, play_) { const sc = sceneList[clamp(i, 0, sceneList.length - 1)]; if (!sc) return; st.t = sc.start; st.until = null; st.sceneEnded = false; if (play_) play(); render(true); }
function replayStep(s) { st.t = Math.max(0, s._t0 - .15); st.until = s._t1 + Math.min(s._hold, 1.2) + .4; st.sceneEnded = false; play(); }
function doAction(a) {
  switch (a) {
    case 'playPause': st.playing ? pause() : play(); break;
    case 'nextScene': { const i = Math.min(sceneList.length - 1, (st.scene < 0 ? 0 : st.scene + 1)); gotoScene(i); break; }
    case 'prevScene': { const sc = sceneList[st.scene]; if (!sc) { st.t = 0; break; } const i = st.t - sc.start > 1.2 ? sc.i : Math.max(0, sc.i - 1); gotoScene(i); if (sc.i === 0 && i === 0 && st.t - sc.start <= 1.2) st.t = 0; break; }
    case 'nextStep': { const s = flat.find(s => s._t0 > st.t + .06); if (s) replayStep(s); break; }
    case 'prevStep': { let p = null; for (const s of flat) if (s._t0 < st.t - .6) p = s; if (p) replayStep(p); else { st.t = 0; render(true); } break; }
    case 'speedUp': st.speedIdx = Math.min(SPEEDS.length - 1, st.speedIdx + 1); break;
    case 'speedDown': st.speedIdx = Math.max(0, st.speedIdx - 1); break;
    case 'restart': st.t = 0; st.until = null; st.sceneEnded = false; if (!st.playing) play(); render(true); break;
    case 'toggleControls': ctrlOn = !ctrlOn; ctrl.classList.toggle('show', ctrlOn); if (!userMoved) refit(true); break;
    case 'toggleHelp': help.classList.toggle('show'); break;
    case 'toggleMode': setMode(st.mode === 'scenes' ? 'timeline' : 'scenes'); break;
    case 'fit': fitView(true); camFollow = camFollow && false; break;
    case 'sizeUp': applySize(TS + .1, BS + .1); break;
    case 'sizeDown': applySize(TS - .1, BS - .1); break;
    case 'toggleSize': sizeBox.classList.toggle('show'); break;
    case 'toggleCamera': camFollow = !camFollow; userMoved = false; lastCamKey = null; if (camFollow) camTick(); else fitView(true); break;
    case 'togglePanel': panel.classList.toggle('hidden'); if (!userMoved) setTimeout(() => refit(true), 30); break;
    case 'toggleLegend': legend.classList.toggle('hidden'); if (!userMoved) setTimeout(() => refit(true), 30); break;
    case 'toggleTheme': setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'); break;
  }
  updateUI();
}
function setTheme(t) { root.dataset.theme = t; document.documentElement.dataset.theme = t; root.style.setProperty('--x', 0); nodeList.forEach(n => { n._g.style.setProperty('--nc-i', t === 'dark' ? `color-mix(in srgb,${n.color} 62%,white)` : n.color); }); }
const normKey = e => e.key === ' ' ? 'Space' : (e.key.length === 1 ? e.key.toLowerCase() : e.key);
addEventListener('keydown', e => {
  if (e.key === MOD_SLOW && !st.slow) { st.slow = true; updateUI(); } if (e.key === MOD_FAST) { if (!st.fast) { st.fast = true; updateUI(); } if (e.key === 'Alt') e.preventDefault(); }
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range') return;
  if (e.metaKey || (e.ctrlKey && MOD_FAST !== 'Control' && MOD_SLOW !== 'Control') || (e.altKey && MOD_FAST !== 'Alt' && MOD_SLOW !== 'Alt')) return;
  if (e.key === 'Escape') { help.classList.remove('show'); sizeBox.classList.remove('show'); select(null); return; }
  const k = normKey(e);
  for (const a in KEYMAP) if (KEYMAP[a].some(x => x === k || x.toLowerCase() === k)) { e.preventDefault(); if (e.repeat && !/speed/.test(a)) return; doAction(a); return; }
});
addEventListener('keyup', e => { if (e.key === MOD_SLOW) st.slow = false; if (e.key === MOD_FAST) { st.fast = false; if (e.key === 'Alt') e.preventDefault(); } updateUI(); });
addEventListener('blur', () => { st.slow = st.fast = false; updateUI(); });
addEventListener('resize', () => { layoutOverlays(); if (!userMoved) refit(false); });

// ---------------------------------------------------------------- main loop
let last = 0;
function loop() {
  if (!st.playing) return;
  const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
  const prevT = st.t; st.t += dt * speedMult();
  if (st.until != null && st.t >= st.until) { st.t = st.until; pause(); }
  else if (st.mode === 'scenes') {
    const sc = sceneList[sceneAt(prevT)];
    if (sc && prevT < sc.end && st.t >= sc.end) {
      if (S.autoAdvance && sceneList[sc.i + 1]) st.t = sceneList[sc.i + 1].start;
      else { st.t = sc.end; st.sceneEnded = sceneList[sc.i + 1] ? 'more' : 'last'; pause(); }
    }
  }
  if (st.t >= T) { if (S.loop && st.mode === 'timeline') st.t = 0; else { st.t = T; pause(); } }
  render();
  if (st.playing) requestAnimationFrame(loop); else updateUI();
}

// ---------------------------------------------------------------- init
let inited = false;
function init() {
  nodeList.forEach(n => { if (n.x != null && n.y != null && (n.x === undefined)) { } });
  layoutAuto();
  const restored = loadLayout();
  groupList.length && buildGroups();
  nodeList.forEach(buildNode); nodeList.forEach(dbClip);
  buildEdges(); geometry(); updateEdges(); updateGroups();
  buildTimeline(); buildEffects(); buildStepViews();
  // durations depend on path lengths, now known; rebuild step views are fine because lengths were measured above.
  updateEdges();
  if (S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)) setTheme('dark'); else setTheme('light');
  buildLegend(); buildHelp(); updatePanelScene(); updateSelCard();
  if (innerWidth < 1400) panel.classList.add('hidden');
  if (!sceneList.length) { panel.classList.add('hidden'); bPanel.style.display = 'none'; bCtrl.style.display = 'none'; }
  fitView(false);
  camFollow = sceneList.length > 0 && (S.camera === 'follow' || (S.camera !== 'fit' && view.k < MIN_K));
  inited = true; render('scene'); camTick(); updateUI();
  if (S.autoplay) play();
  document.title = S.title;
  window.__fds = { view, st, T, scenes: sceneList, layout() { const o = {}; nodeList.forEach(n => o[n.id] = { x: Math.round(n.x), y: Math.round(n.y) }); return JSON.stringify(o); }, flat, nodes, edges, seek(t) { pause(); st.t = clamp(t, 0, T); st.sceneEnded = false; render(true); }, play, pause, doAction, fit: fitView,
    texts() { return [...document.querySelectorAll('.node text')].map(t => { const b = t.getBBox(); const n = t.closest('.node'); return { text: t.textContent, w: b.width, x: b.x, node: n.dataset.id, nodeW: nodes[n.dataset.id].w0 }; }); } };
}
init();
})();
