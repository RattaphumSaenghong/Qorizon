// wf-journal.jsx — Tap a post → the whole trip as a journal/trail.
// 3 approaches. Reuses the shared sketch kit.

// contextual header: came in FROM a post
function JournalHeader({ tab = 'Journal' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', height: 54, borderBottom: '2px solid var(--ink)', flex: '0 0 auto', background: 'var(--paper)' }}>
      <Wordmark size={22} />
      <span style={{ color: 'var(--sub)', fontSize: 16 }}>‹ back to feed</span>
      <div style={{ flex: 1 }} />
      <Chip dot={false}>♡ 1,204</Chip>
      <Btn sm>↗ Share</Btn>
      <Btn solid sm>⑂ Use this trip</Btn>
      <Avatar size={34} ring />
    </div>
  );
}

// one journal moment on a day timeline
function Moment({ time = '9:00', loc = 'Fushimi Inari', photo = '[ photo ]', audio = false, h = 150, last = false }) {
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      {/* time gutter + rail */}
      <div style={{ width: 56, flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--sub)', marginBottom: 4 }}>{time}</div>
        <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2.5px solid var(--acc)', background: 'var(--accSoft)' }} />
        {!last && <div style={{ width: 2, flex: 1, background: 'var(--line)', marginTop: 2 }} />}
      </div>
      {/* card */}
      <div style={{ flex: 1, paddingBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Chip dot accent style={{ alignSelf: 'flex-start', fontSize: 13 }}>{loc}</Chip>
        <Ph label={photo} style={{ height: h, width: '100%' }} />
        <Bars lines={2} w={['100%', '55%']} h={9} />
        {audio && <div className="sk" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', fontSize: 14, background: 'var(--panel)' }}>▶ audio journal · 0:42 <span style={{ color: 'var(--sub)' }}>≈≈≈≈≈≈≈</span></div>}
      </div>
    </div>
  );
}

function DayHead({ n = 1, place = 'Tokyo', date = 'Apr 12', stops = '12 moments' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 14px' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--acc)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flex: '0 0 auto' }}>{n}</div>
      <div style={{ fontSize: 22, whiteSpace: 'nowrap', flex: '0 0 auto' }}>Day {n} — {place}</div>
      <div style={{ flex: 1 }} />
      <Chip dot={false} style={{ fontSize: 13 }}>{date}</Chip>
      <Chip dot={false} style={{ fontSize: 13 }}>{stops}</Chip>
    </div>
  );
}

// ── A · Vertical journal + sticky trail map ──────────────────
function JournalA() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <JournalHeader />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* journal column */}
          <div style={{ flex: 1, padding: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* trip hero */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Ph label="[ trip cover ]" style={{ height: 150 }} />
              <div style={{ position: 'absolute', left: 16, bottom: 12 }}>
                <div className="note" style={{ fontFamily: "'Caveat',cursive", fontSize: 30, color: 'var(--ink)', lineHeight: 1, whiteSpace: 'nowrap', background: 'var(--paper)', padding: '2px 10px', borderRadius: 6 }}>7 Days in Japan</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar size={40} ring />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 16 }}>@somchai.travels</div>
                <span style={{ color: 'var(--sub)', fontSize: 14 }}>Apr 2026 · 7 days · 84 photos · 6 audio notes</span>
              </div>
              <div style={{ flex: 1 }} />
              <Chip dot={false} accent>⑂ 24 forks</Chip>
            </div>
            <div style={{ display: 'flex', gap: 8, margin: '14px 0 16px' }}>
              <Chip dot={false} accent>Journal</Chip><Chip dot={false}>Map</Chip><Chip dot={false}>Album</Chip><Chip dot={false}>Bookings</Chip>
            </div>
            {/* day blocks */}
            <DayHead n={1} place="Tokyo" date="Apr 12" />
            <Moment time="8:40" loc="Tsukiji Market" photo="[ photo ]" audio />
            <Moment time="13:10" loc="teamLab Planets" photo="[ photo + 0:18 video ]" last />
            <DayHead n={2} place="Hakone" date="Apr 13" />
            <Moment time="10:00" loc="Lake Ashi" photo="[ photo ]" last />
          </div>
          {/* sticky trail map */}
          <div style={{ width: 420, borderLeft: '2px solid var(--ink)', position: 'relative', flex: '0 0 auto' }}>
            <MapBg label="the whole trail">
              <Pin x="30%" y="62%" n="1" accent /><Pin x="44%" y="46%" n="2" accent /><Pin x="60%" y="34%" n="3" /><Pin x="74%" y="22%" n="4" />
              <div className="sk" style={{ position: 'absolute', left: 16, top: 16, background: 'var(--paper)', padding: '7px 12px', fontSize: 14 }}>Following along · Day 1 of 7</div>
              {/* day scrubber dots */}
              <div className="sk" style={{ position: 'absolute', right: 14, top: 14, background: 'var(--paper)', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => <div key={d} style={{ width: 9, height: 9, borderRadius: '50%', background: d === 1 ? 'var(--acc)' : 'var(--line)' }} />)}
              </div>
            </MapBg>
            <Note style={{ left: 16, bottom: 92, width: 160 }} arrow="down">map stays pinned as<br />you scroll the journal</Note>
          </div>
        </div>
      </div>
    </IPad>
  );
}

// ── B · Map-led journey, day scrubber ────────────────────────
function JournalB() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <JournalHeader />
        {/* big trail map */}
        <div style={{ height: 320, borderBottom: '2px solid var(--ink)', position: 'relative', flex: '0 0 auto' }}>
          <MapBg label="Mapbox · journey replay" style={{ height: '100%' }}>
            <Pin x="18%" y="64%" n="1" accent /><Pin x="32%" y="44%" n="2" accent /><Pin x="46%" y="56%" n="3" /><Pin x="60%" y="34%" n="4" /><Pin x="74%" y="48%" n="5" /><Pin x="86%" y="30%" n="6" />
            <div className="sk" style={{ position: 'absolute', left: 18, top: 16, background: 'var(--paper)', padding: '8px 14px', fontSize: 16 }}>7 Days in Japan · @somchai</div>
            <div className="sk" style={{ position: 'absolute', right: 16, top: 16, background: 'var(--paper)', padding: '7px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>▶ Replay journey</div>
          </MapBg>
        </div>
        {/* day scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '2px solid var(--ink)', flex: '0 0 auto', overflow: 'hidden' }}>
          <span style={{ fontSize: 15, color: 'var(--sub)', marginRight: 4 }}>Days</span>
          {['Tokyo', 'Hakone', 'Kyoto', 'Osaka', 'Nara', 'Kobe', 'Tokyo'].map((c, i) => (
            <div key={i} className="sk" style={{ padding: '5px 12px', fontSize: 14, whiteSpace: 'nowrap', background: i === 2 ? 'var(--accSoft)' : 'transparent', borderColor: i === 2 ? 'var(--acc)' : 'var(--ink)' }}>D{i + 1} · {c}</div>
          ))}
        </div>
        {/* selected day's moments */}
        <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}><div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--acc)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div><div style={{ fontSize: 20 }}>Day 3 — Kyoto</div><Chip dot={false} style={{ fontSize: 13 }}>5 moments</Chip></div>
          <div style={{ display: 'flex', gap: 14, overflow: 'hidden' }}>
            {[['8:40', 'Fushimi Inari'], ['11:20', 'Nishiki Market'], ['14:00', 'Arashiyama'], ['18:30', 'Gion']].map(([t, l], i) => (
              <div key={i} className="sk" style={{ width: 230, flex: '0 0 auto', background: 'var(--paper)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--sub)' }}><span>{t}</span><span>♡ 88</span></div>
                <Ph label={i === 0 ? '[ photo ]' : ''} style={{ height: 150 }} sk={false} />
                <Chip dot accent style={{ fontSize: 12, alignSelf: 'flex-start' }}>{l}</Chip>
                <Bars lines={2} w={['100%', '60%']} h={8} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Note style={{ right: 60, top: 130 }} arrow="up">scrub the trail like a<br />story — pick a day,<br />moments load below</Note>
    </IPad>
  );
}

// ── C · Scrapbook spread (travel diary) ──────────────────────
function Polaroid({ label = '', rot = -3, w = 180, h = 150, tape = true }) {
  return (
    <div style={{ position: 'relative', transform: `rotate(${rot}deg)`, background: 'var(--paper)', padding: '8px 8px 26px', border: '1.5px solid var(--line)', boxShadow: '0 3px 10px rgba(0,0,0,0.1)', width: w }}>
      {tape && <div style={{ position: 'absolute', left: '50%', top: -9, transform: 'translateX(-50%) rotate(2deg)', width: 54, height: 18, background: 'var(--accSoft)', border: '1px solid var(--acc)', opacity: 0.7 }} />}
      <Ph label={label} style={{ height: h, width: '100%' }} sk={false} />
    </div>
  );
}

function JournalC() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <JournalHeader />
        {/* diary spread */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, background: 'var(--panel)' }}>
          {/* left page */}
          <div style={{ flex: 1, padding: 28, position: 'relative', borderRight: '2px dashed var(--line)' }}>
            <div className="note" style={{ fontFamily: "'Caveat',cursive", fontSize: 40, lineHeight: 1, marginBottom: 6 }}>Day 3 · Kyoto</div>
            <div className="note" style={{ fontFamily: "'Caveat',cursive", fontSize: 22, color: 'var(--sub)' }}>Apr 14 · woke up at 6, chased torii gates ⛩</div>
            <div style={{ position: 'absolute', left: 30, top: 130 }}><Polaroid label="[ photo ]" rot={-4} w={200} h={160} /></div>
            <div style={{ position: 'absolute', left: 250, top: 180 }}><Polaroid label="[ photo ]" rot={3} w={150} h={130} /></div>
            <div className="note" style={{ position: 'absolute', left: 250, top: 130, fontFamily: "'Caveat',cursive", fontSize: 24, color: 'var(--acc)' }}>so many gates!! →</div>
            <div className="sk" style={{ position: 'absolute', left: 40, bottom: 30, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 14, background: 'var(--paper)' }}>▶ voice note · 0:42</div>
          </div>
          {/* right page */}
          <div style={{ flex: 1, padding: 28, position: 'relative' }}>
            <div style={{ position: 'absolute', right: 30, top: 24 }}><Polaroid label="[ photo ]" rot={4} w={180} h={200} /></div>
            <div className="note" style={{ position: 'absolute', left: 28, top: 40, fontFamily: "'Caveat',cursive", fontSize: 24, maxWidth: 200, lineHeight: 1.15 }}>lunch at Nishiki — the tamago was unreal</div>
            {/* inset route map */}
            <div className="sk" style={{ position: 'absolute', left: 28, bottom: 30, width: 230, height: 150, overflow: 'hidden', background: 'var(--paper)', padding: 4 }}>
              <MapBg label="day 3 route" style={{ height: '100%' }}><Pin x="30%" y="60%" n="" accent size={16} /><Pin x="60%" y="40%" n="" accent size={16} /></MapBg>
            </div>
            <div className="note" style={{ position: 'absolute', right: 40, bottom: 40, fontFamily: "'Caveat',cursive", fontSize: 22, color: 'var(--acc)' }}>↺ swipe for Day 4</div>
          </div>
        </div>
      </div>
      <Note style={{ left: 70, top: 430 }} arrow="down">scrapbook mode —<br />photos + handwriting<br />+ a route per day</Note>
    </IPad>
  );
}

Object.assign(window, { JournalA, JournalB, JournalC });
