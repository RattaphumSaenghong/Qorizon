// wf-builder.jsx — Trip Builder (Canva-style blueprint), 3 approaches.

// a draggable content block in the blocks panel
function BlockChip({ g, label }) {
  return (
    <div className="sk" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', background: 'var(--paper)', fontSize: 15, cursor: 'grab' }}>
      <span style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: 'var(--accSoft)', border: '1.5px solid var(--acc)', borderRadius: 6 }}>{g}</span>
      {label}
      <div style={{ flex: 1 }} />
      <span style={{ color: 'var(--sub)' }}>⠿</span>
    </div>
  );
}

// a placed stop card on the canvas
function StopCard({ label = '[ place ]', wide = false }) {
  return (
    <div className="sk" style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--paper)', width: wide ? '100%' : 320 }}>
      <Ph label={label} style={{ width: 84, height: 84, flex: '0 0 auto' }} sk={false} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, justifyContent: 'center' }}>
        <div style={{ height: 11, width: '70%', background: 'var(--bar)', borderRadius: 5 }} />
        <Chip dot accent style={{ fontSize: 12, alignSelf: 'flex-start' }}>9:00 · 1.5 hrs</Chip>
        <Bars lines={1} w={['90%']} h={8} />
      </div>
    </div>
  );
}

function BuildA() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* editor toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', height: 54, borderBottom: '2px solid var(--ink)', flex: '0 0 auto' }}>
          <Wordmark size={22} />
          <span style={{ color: 'var(--sub)' }}>‹ back</span>
          <div style={{ height: 10, width: 220, background: 'var(--bar)', borderRadius: 5 }} />
          <div style={{ flex: 1 }} />
          <Chip dot={false}>Auto-saved</Chip>
          <Btn sm>Preview</Btn>
          <Btn solid sm>Publish trip</Btn>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* left: blocks library */}
          <div style={{ width: 210, borderRight: '2px solid var(--ink)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--panel)' }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--sub)' }}>DRAG BLOCKS IN</div>
            <BlockChip g="◷" label="Day" />
            <BlockChip g="⚲" label="Place" />
            <BlockChip g="✈" label="Flight" />
            <BlockChip g="⌂" label="Hotel" />
            <BlockChip g="✎" label="Note" />
            <BlockChip g="▦" label="Photo" />
            <BlockChip g="฿" label="Budget" />
          </div>
          {/* center: canvas blueprint */}
          <div style={{ flex: 1, padding: 24, overflow: 'hidden', background: 'repeating-linear-gradient(0deg,transparent,transparent 31px,var(--grid) 31px,var(--grid) 32px)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 540 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--acc)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>3</div><div style={{ fontSize: 22 }}>Day 3 — Kyoto</div></div>
              <StopCard label="[ temple ]" wide />
              <StopCard label="[ lunch ]" wide />
              {/* drop zone */}
              <div className="sk2" style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sub)', borderStyle: 'dashed', fontSize: 16 }}>+ drop a place, note or flight here</div>
            </div>
          </div>
          {/* right: inspector */}
          <div style={{ width: 280, borderLeft: '2px solid var(--ink)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--panel)' }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--sub)' }}>SELECTED BLOCK</div>
            <Ph label="[ cover photo ]" style={{ height: 130, background: 'var(--paper)' }} />
            <div style={{ height: 11, width: '60%', background: 'var(--bar)', borderRadius: 5 }} />
            <div style={{ display: 'flex', gap: 8 }}><Chip dot={false}>Start 9:00</Chip><Chip dot={false}>1.5 hrs</Chip></div>
            <Bars lines={3} w={['100%', '100%', '50%']} h={8} />
            <Btn full sm>＋ Add to booking</Btn>
          </div>
        </div>
      </div>
      <Note style={{ left: 230, top: 130 }} arrow="left">Canva model:<br />blocks → canvas →<br />edit on the right</Note>
    </IPad>
  );
}

function BuildB() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar active="Trips" right={false} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* left: day timeline */}
          <div style={{ width: 460, borderRight: '2px solid var(--ink)', padding: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ fontSize: 24 }}>Japan · 7 days</div><div style={{ flex: 1 }} /><Btn sm>＋ Day</Btn></div>
            <div style={{ display: 'flex', gap: 8 }}>{['D1', 'D2', 'D3', 'D4', 'D5'].map((d, i) => <Chip key={d} dot={false} accent={i === 2}>{d}</Chip>)}</div>
            {/* timeline rail */}
            <div style={{ display: 'flex', gap: 14, flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid var(--acc)', background: 'var(--acc)' }} />
                <div style={{ width: 2, flex: 1, background: 'var(--ink)' }} />
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid var(--ink)' }} />
                <div style={{ width: 2, flex: 1, background: 'var(--ink)' }} />
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid var(--ink)' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <StopCard label="[ stop 1 ]" wide />
                <StopCard label="[ stop 2 ]" wide />
                <StopCard label="[ stop 3 ]" wide />
              </div>
            </div>
          </div>
          {/* right: map w/ route */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MapBg label="Mapbox · route preview">
              <Pin x="28%" y="64%" n="1" accent />
              <Pin x="46%" y="44%" n="2" accent />
              <Pin x="68%" y="30%" n="3" accent />
              <div className="sk" style={{ position: 'absolute', right: 18, top: 18, background: 'var(--paper)', padding: '8px 12px', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 4 }}><span>Day 3 route</span><span style={{ color: 'var(--sub)' }}>3 stops · 4.2 km · 22 min walk</span></div>
              {/* search to add */}
              <div className="sk" style={{ position: 'absolute', left: 18, bottom: 18, background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', width: 320, color: 'var(--sub)', fontSize: 15 }}><span>⌕</span> Search a place to drop onto Day 3</div>
            </MapBg>
            <Note style={{ left: 360, top: 90 }} arrow="left">plan by geography —<br />days &amp; map stay<br />in sync</Note>
          </div>
        </div>
      </div>
    </IPad>
  );
}

function BuildC() {
  const days = ['Day 1 · Tokyo', 'Day 2 · Hakone', 'Day 3 · Kyoto', 'Day 4 · Osaka'];
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', height: 54, borderBottom: '2px solid var(--ink)', flex: '0 0 auto' }}>
          <Wordmark size={22} /><div style={{ fontSize: 20 }}>Japan blueprint</div><div style={{ flex: 1 }} /><Btn sm>Map view</Btn><Btn solid sm>Publish</Btn><Avatar size={34} ring />
        </div>
        {/* mini map strip */}
        <div style={{ flex: '0 0 auto', height: 92, borderBottom: '2px solid var(--ink)' }}>
          <MapBg label="route overview" style={{ height: '100%' }}>
            <Pin x="20%" y="55%" n="1" accent size={20} /><Pin x="40%" y="40%" n="2" accent size={20} /><Pin x="60%" y="60%" n="3" accent size={20} /><Pin x="80%" y="45%" n="4" accent size={20} />
          </MapBg>
        </div>
        {/* kanban columns */}
        <div style={{ flex: 1, display: 'flex', gap: 16, padding: 18, overflow: 'hidden', alignItems: 'flex-start' }}>
          {days.map((d, di) => (
            <div key={d} style={{ width: 260, flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--panel)', border: '2px solid var(--ink)', borderRadius: '14px 6px 16px 8px/8px 14px 6px 16px', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 24, height: 24, borderRadius: '50%', background: di === 2 ? 'var(--acc)' : 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{di + 1}</div><div style={{ fontSize: 15 }}>{d}</div></div>
              <StopCard wide />
              {di < 3 && <StopCard wide />}
              <div className="sk2" style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sub)', borderStyle: 'dashed', fontSize: 14 }}>＋ add stop</div>
            </div>
          ))}
          <div style={{ width: 70, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sub)', fontSize: 32, height: 80 }}>＋</div>
        </div>
      </div>
      <Note style={{ right: 90, top: 200 }} arrow="down">days = columns,<br />drag stops between<br />them like cards</Note>
    </IPad>
  );
}

Object.assign(window, { BuildA, BuildB, BuildC });
