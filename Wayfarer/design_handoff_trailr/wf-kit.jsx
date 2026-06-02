// wf-kit.jsx — low-fi sketch wireframe primitives for Trailr (tablet/iPad)
// Exports to window. Loaded as text/babel after React.
// Aesthetic: warm paper, ink strokes, hand-drawn borders, one warm accent.

const BEZEL = 16;
const SCREEN_W = 1194;
const SCREEN_H = 834;
const ARTW = SCREEN_W + BEZEL * 2;
const ARTH = SCREEN_H + BEZEL * 2;

// ── Device shell ─────────────────────────────────────────────
function IPad({ children, pad = 0 }) {
  return (
    <div className="wf wf-ipad" style={{ width: ARTW, height: ARTH, background: '#262420', borderRadius: 34, padding: BEZEL, boxShadow: 'inset 0 0 0 2px #423e34' }}>
      <div className="wf-cam" />
      <div className="wf-screen" style={{ width: SCREEN_W, height: SCREEN_H, background: 'var(--paper)', borderRadius: 18, overflow: 'hidden', position: 'relative', padding: pad }}>
        {children}
      </div>
    </div>
  );
}

// ── Generic sketch box ───────────────────────────────────────
function Box({ children, className = '', style, sk = true, ...rest }) {
  return <div className={(sk ? 'sk ' : '') + className} style={style} {...rest}>{children}</div>;
}

// ── Striped image / content placeholder w/ mono caption ──────
function Ph({ label, style, className = '', round = false, sk = true }) {
  return (
    <div className={(sk ? 'sk ' : '') + 'hatch ' + className} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: round ? '50%' : undefined, ...style }}>
      {label && <span className="mono" style={{ fontSize: 12, color: 'var(--sub)', letterSpacing: 0.3, textAlign: 'center', padding: '0 6px' }}>{label}</span>}
    </div>
  );
}

// ── Avatar (sketch circle) ───────────────────────────────────
function Avatar({ size = 36, ring = false }) {
  return <div className="hatch" style={{ width: size, height: size, borderRadius: '50%', border: ring ? '2.5px solid var(--acc)' : '2px solid var(--ink)', flex: '0 0 auto' }} />;
}

// ── Map pin (circle + stem) ──────────────────────────────────
function Pin({ x, y, accent = false, n, size = 26 }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
      <div style={{ width: size, height: size, borderRadius: '50% 50% 50% 0', transform: 'rotate(45deg)', background: accent ? 'var(--acc)' : 'var(--paper)', border: '2.5px solid ' + (accent ? 'var(--acc)' : 'var(--ink)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ transform: 'rotate(-45deg)', fontSize: 13, color: accent ? '#fff' : 'var(--ink)', fontFamily: "'Patrick Hand',cursive" }}>{n}</span>
      </div>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(0,0,0,.18)', marginTop: 1 }} />
    </div>
  );
}

// ── Fake Mapbox map surface ──────────────────────────────────
function MapBg({ children, label = 'Mapbox map', route = true, style, className = '' }) {
  return (
    <div className={'wf-map ' + className} style={{ position: 'relative', overflow: 'hidden', background: 'var(--map)', height: '100%', ...style }}>
      <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <g stroke="var(--mapline)" strokeWidth="2" fill="none" opacity="0.9">
          <path d="M-20 120 L400 90 L640 220 L900 180 L1300 240" />
          <path d="M120 -20 L160 260 L120 520 L210 820" />
          <path d="M-20 430 L380 410 L620 470 L1000 430 L1320 480" />
          <path d="M560 -20 L600 240 L540 470 L600 700 L560 900" />
          <path d="M860 -20 L900 300 L840 560 L900 860" />
        </g>
        <path d="M-30 700 Q200 640 360 690 T760 660 T1260 700 L1260 900 L-30 900 Z" fill="var(--mapwater)" opacity="0.7" />
        {route && <path d="M150 660 C320 560 360 380 520 360 S760 300 880 200" stroke="var(--acc)" strokeWidth="3.5" strokeDasharray="2 9" strokeLinecap="round" fill="none" opacity="0.95" />}
      </svg>
      {children}
      <span className="mono" style={{ position: 'absolute', left: 12, bottom: 10, fontSize: 11, color: 'var(--sub)', background: 'var(--paper)', padding: '2px 7px', borderRadius: 4, opacity: 0.85 }}>[ {label} ]</span>
    </div>
  );
}

// ── Pill button ──────────────────────────────────────────────
function Btn({ children, solid = false, sm = false, style, full = false }) {
  return (
    <div className="sk" style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: sm ? '5px 12px' : '9px 18px', fontSize: sm ? 15 : 18, lineHeight: 1,
      background: solid ? 'var(--acc)' : 'transparent', color: solid ? '#fff' : 'var(--ink)',
      borderColor: solid ? 'var(--acc)' : 'var(--ink)', width: full ? '100%' : undefined, whiteSpace: 'nowrap', ...style,
    }}>{children}</div>
  );
}

// ── Small square icon button w/ glyph ────────────────────────
function IconBtn({ g, size = 34, active = false, style }) {
  return (
    <div className="sk" style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, background: active ? 'var(--accSoft)' : 'transparent', borderColor: active ? 'var(--acc)' : 'var(--ink)', color: 'var(--ink)', flex: '0 0 auto', ...style }}>{g}</div>
  );
}

// ── Location chip ────────────────────────────────────────────
function Chip({ children, dot = true, accent = false, style }) {
  return (
    <span className="sk" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', fontSize: 14, lineHeight: 1.1, background: accent ? 'var(--accSoft)' : 'var(--panel)', borderColor: accent ? 'var(--acc)' : 'var(--line)', borderWidth: 1.5, color: 'var(--ink)', whiteSpace: 'nowrap', ...style }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--acc)', flex: '0 0 auto' }} />}
      {children}
    </span>
  );
}

// ── Grey text lines ──────────────────────────────────────────
function Bars({ lines = 2, w = ['100%', '70%'], h = 9, gap = 8, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{ height: h, width: Array.isArray(w) ? (w[i] ?? w[w.length - 1]) : w, background: 'var(--bar)', borderRadius: 5 }} />
      ))}
    </div>
  );
}

// ── Handwritten margin annotation ────────────────────────────
function Note({ children, style, arrow }) {
  return (
    <div className="note" style={{ position: 'absolute', fontFamily: "'Caveat',cursive", color: 'var(--acc)', fontSize: 22, lineHeight: 1.1, zIndex: 6, maxWidth: 200, ...style }}>
      {arrow === 'left' && <span style={{ marginRight: 4 }}>↜</span>}
      {children}
      {arrow === 'down' && <span style={{ display: 'block' }}>↓</span>}
      {arrow === 'right' && <span style={{ marginLeft: 4 }}>↝</span>}
    </div>
  );
}

// ── Trailr wordmark ──────────────────────────────────────────
function Wordmark({ size = 26 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, fontFamily: "'Caveat',cursive", fontSize: size, fontWeight: 700, color: 'var(--ink)', letterSpacing: 0.5 }}>
      trailr<span style={{ width: size * 0.16, height: size * 0.16, borderRadius: '50%', background: 'var(--acc)', display: 'inline-block', marginLeft: 1 }} />
    </span>
  );
}

// ── Standard top app bar (tablet) ────────────────────────────
function TopBar({ active = 'Feed', tabs = ['Feed', 'Explore', 'Trips', 'Saved'], right = true }) {
  return (
    <div className="wf-topbar" style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '0 22px', height: 58, borderBottom: '2px solid var(--ink)', background: 'var(--paper)', flex: '0 0 auto' }}>
      <Wordmark />
      <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
        {tabs.map((t) => (
          <div key={t} className={t === active ? 'sk' : ''} style={{ padding: '5px 13px', fontSize: 17, color: t === active ? 'var(--ink)' : 'var(--sub)', borderColor: t === active ? 'var(--acc)' : 'transparent', background: t === active ? 'var(--accSoft)' : 'transparent' }}>{t}</div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      {right && <>
        <div className="sk" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', minWidth: 220, color: 'var(--sub)', fontSize: 15 }}><span>⌕</span> Search places, trips, people</div>
        <Btn solid sm>+ New trip</Btn>
        <Avatar size={36} ring />
      </>}
    </div>
  );
}

// ── Left icon rail (alt navigation) ──────────────────────────
function Rail({ items = ['◎', '⌕', '✚', '♡', '≡'], active = 0 }) {
  return (
    <div style={{ width: 64, borderRight: '2px solid var(--ink)', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px 0', flex: '0 0 auto' }}>
      <Wordmark size={20} />
      <div style={{ height: 6 }} />
      {items.map((g, i) => <IconBtn key={i} g={g} active={i === active} size={40} />)}
      <div style={{ flex: 1 }} />
      <Avatar size={38} ring />
    </div>
  );
}

Object.assign(window, { IPad, Box, Ph, Avatar, Pin, MapBg, Btn, IconBtn, Chip, Bars, Note, Wordmark, TopBar, Rail, ARTW, ARTH, SCREEN_W, SCREEN_H });
