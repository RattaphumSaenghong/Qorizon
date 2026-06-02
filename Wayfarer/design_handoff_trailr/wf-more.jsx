// wf-more.jsx — Auto-Album (2), Booking (2), Profile (2).

// ───────────── AUTO-ALBUM ─────────────
function AlbumA() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar active="Trips" right={false} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px', borderBottom: '2px solid var(--ink)' }}>
          <div style={{ fontSize: 22 }}>Auto-album</div>
          <Chip dot accent>generated from 84 photos</Chip>
          <div style={{ flex: 1 }} />
          <Btn sm>Reorder</Btn><Btn solid sm>Post album</Btn>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* left: day trail map */}
          <div style={{ width: 380, borderRight: '2px solid var(--ink)', position: 'relative' }}>
            <MapBg label="GPS trail · Day 3" style={{ height: '100%' }}>
              <Pin x="32%" y="30%" n="" accent size={18} /><Pin x="50%" y="48%" n="" accent size={18} /><Pin x="40%" y="66%" n="" accent size={18} /><Pin x="64%" y="58%" n="" accent size={18} />
              <div className="sk" style={{ position: 'absolute', left: 16, top: 16, background: 'var(--paper)', padding: '7px 12px', fontSize: 14 }}>📍 auto-matched to your route</div>
            </MapBg>
          </div>
          {/* right: clustered grid */}
          <div style={{ flex: 1, padding: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><div style={{ fontSize: 18 }}>Morning · Fushimi Inari</div><Chip dot={false} style={{ fontSize: 12 }}>8:12–10:40</Chip><div style={{ flex: 1 }} /><span style={{ color: 'var(--sub)', fontSize: 14 }}>edit cluster</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                <Ph label="[ photo ]" style={{ height: 96 }} /><Ph style={{ height: 96 }} /><Ph style={{ height: 96 }} /><Ph style={{ height: 96 }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}><div style={{ fontSize: 18 }}>Lunch · Nishiki Market</div><Chip dot={false} style={{ fontSize: 12 }}>12:30</Chip><div style={{ flex: 1 }} /><span style={{ color: 'var(--sub)', fontSize: 14 }}>edit cluster</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                <Ph style={{ height: 96 }} /><Ph label="[ 0:18 video ]" style={{ height: 96 }} /><Ph style={{ height: 96 }} />
                <div className="sk2" style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sub)', borderStyle: 'dashed', fontSize: 14, textAlign: 'center' }}>＋ add<br />caption</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Note style={{ left: 250, top: 150 }} arrow="left">photos auto-group<br />by time + place —<br />user just tweaks</Note>
    </IPad>
  );
}

function AlbumB() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar active="Trips" right={false} />
        <div style={{ flex: 1, position: 'relative' }}>
          <MapBg label="Mapbox · photo-pinned story" style={{ height: '100%' }}>
            {/* trail with photo thumbs pinned along it */}
            {[['26%', '28%'], ['40%', '40%'], ['52%', '34%'], ['58%', '52%'], ['70%', '60%']].map(([x, y], i) => (
              <div key={i} className="sk" style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', width: 78, height: 78, background: 'var(--paper)', padding: 4, zIndex: 2 }}>
                <Ph style={{ width: '100%', height: '100%' }} sk={false} />
              </div>
            ))}
            <div className="sk" style={{ position: 'absolute', left: 22, top: 20, background: 'var(--paper)', padding: '8px 14px', fontSize: 16 }}>Day 3 · Kyoto — tap a photo to open</div>
          </MapBg>
          {/* right story column */}
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 340, borderLeft: '2px solid var(--ink)', background: 'var(--panel)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 18 }}>The story</div>
            <div style={{ display: 'flex', gap: 12 }}><div style={{ width: 4, background: 'var(--acc)', borderRadius: 2 }} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Ph label="[ photo ]" style={{ height: 150, background: 'var(--paper)' }} />
              <Chip dot accent style={{ alignSelf: 'flex-start' }}>8:40 · Fushimi Inari</Chip>
              <Bars lines={2} w={['100%', '60%']} h={9} />
              <Ph style={{ height: 110, background: 'var(--paper)' }} />
              <Chip dot accent style={{ alignSelf: 'flex-start' }}>12:30 · Nishiki Market</Chip>
            </div></div>
          </div>
        </div>
      </div>
      <Note style={{ left: 120, top: 250 }} arrow="down">album lives ON the map —<br />a walked photo-trail</Note>
    </IPad>
  );
}

// ───────────── BOOKING ─────────────
function HotelRow({ accent = false }) {
  return (
    <div className="sk" style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--paper)', borderColor: accent ? 'var(--acc)' : 'var(--ink)' }}>
      <Ph label="[ hotel ]" style={{ width: 110, height: 90, flex: '0 0 auto' }} sk={false} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
        <div style={{ height: 11, width: '60%', background: 'var(--bar)', borderRadius: 5 }} />
        <div style={{ display: 'flex', gap: 7 }}><Chip dot={false} style={{ fontSize: 12 }}>★ 8.9</Chip><Chip dot={false} style={{ fontSize: 12 }}>0.4km to Day 3</Chip></div>
        <Bars lines={1} w={['80%']} h={7} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
        <div style={{ fontSize: 18 }}>฿2,400</div>
        <Btn solid sm>Book</Btn>
      </div>
    </div>
  );
}

function BookA() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', height: 54, borderBottom: '2px solid var(--ink)', flex: '0 0 auto' }}>
          <Wordmark size={22} /><span style={{ color: 'var(--sub)' }}>‹ Japan trip</span><div style={{ fontSize: 20 }}>Add stays &amp; flights</div><div style={{ flex: 1 }} /><Chip dot={false}>Day 1–7</Chip>
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* booking column inside the trip */}
          <div style={{ width: 560, borderRight: '2px solid var(--ink)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
            {/* flight summary card */}
            <div className="sk" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14, background: 'var(--paper)' }}>
              <span style={{ fontSize: 22 }}>✈</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><div style={{ fontSize: 17 }}>BKK → KIX</div><span style={{ color: 'var(--sub)', fontSize: 14 }}>1 May · 1 stop · 7h 20m</span></div>
              <div style={{ flex: 1 }} />
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 18 }}>฿9,800</div><span className="mono" style={{ fontSize: 11, color: 'var(--sub)' }}>via Amadeus</span></div>
              <Btn solid sm>Book</Btn>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ fontSize: 18 }}>Stays near your route</div><div style={{ flex: 1 }} /><Chip dot={false} accent>Agoda</Chip><Chip dot={false}>Booking.com</Chip></div>
            <HotelRow accent />
            <HotelRow />
            <HotelRow />
          </div>
          {/* map of hotels */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MapBg label="stays vs your stops">
              <Pin x="40%" y="42%" n="A" accent /><Pin x="58%" y="34%" n="B" /><Pin x="50%" y="58%" n="C" />
              <div className="sk" style={{ position: 'absolute', right: 16, top: 16, background: 'var(--paper)', padding: '7px 12px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--acc)' }} /> = your Day 3 stops</div>
            </MapBg>
          </div>
        </div>
      </div>
      <Note style={{ left: 360, top: 150 }} arrow="left">booking lives INSIDE<br />the trip — stays ranked<br />by distance to stops</Note>
    </IPad>
  );
}

function BookB() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar active="Trips" right={false} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* filters */}
          <div style={{ width: 240, borderRight: '2px solid var(--ink)', padding: 18, background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--sub)' }}>FILTERS</div>
            <div className="sk" style={{ padding: '9px 12px', fontSize: 14, color: 'var(--sub)' }}>Dates · 1–7 May</div>
            <div className="sk" style={{ padding: '9px 12px', fontSize: 14, color: 'var(--sub)' }}>2 guests · 1 room</div>
            <div style={{ fontSize: 14 }}>Price ฿</div>
            <div style={{ height: 6, background: 'var(--bar)', borderRadius: 3, position: 'relative' }}><div style={{ position: 'absolute', left: '15%', right: '40%', top: 0, bottom: 0, background: 'var(--acc)', borderRadius: 3 }} /></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}><Chip dot={false}>Wifi</Chip><Chip dot={false}>Pool</Chip><Chip dot={false} accent>Near transit</Chip><Chip dot={false}>Breakfast</Chip></div>
          </div>
          {/* results w/ tabs */}
          <div style={{ width: 540, borderRight: '2px solid var(--ink)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 8 }}><Chip dot={false} accent>Hotels 86</Chip><Chip dot={false}>Flights 24</Chip><div style={{ flex: 1 }} /><Chip dot={false}>Sort: Best</Chip></div>
            <HotelRow accent /><HotelRow /><HotelRow /><HotelRow />
          </div>
          {/* map */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MapBg label="results map" route={false}>
              <Pin x="36%" y="40%" n="฿" accent /><Pin x="56%" y="32%" n="฿" /><Pin x="48%" y="56%" n="฿" /><Pin x="68%" y="50%" n="฿" />
            </MapBg>
          </div>
        </div>
      </div>
      <Note style={{ left: 270, top: 120 }} arrow="down">dedicated search —<br />filters · Flights/Hotels<br />tabs · live map</Note>
    </IPad>
  );
}

// ───────────── PROFILE ─────────────
function TripCard({ live = false, forked = false }) {
  return (
    <div className="sk" style={{ background: 'var(--paper)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative' }}>
        <Ph label="[ trip cover ]" style={{ height: 130 }} sk={false} />
        {live && <div className="sk" style={{ position: 'absolute', left: 8, top: 8, background: 'var(--acc)', color: '#fff', borderColor: 'var(--acc)', padding: '2px 9px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} /> LIVE</div>}
      </div>
      <div style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 10, width: '75%', background: 'var(--bar)', borderRadius: 5 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--sub)' }}><span>⑂ 24 forks</span><span>·</span><span>♡ 1.2k</span></div>
        {forked && <Chip dot={false} style={{ fontSize: 11, alignSelf: 'flex-start' }}>↳ based on @mai's Japan trip</Chip>}
      </div>
    </div>
  );
}

function ProfA() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar active="Trips" />
        <div style={{ flex: 1, overflow: 'hidden', padding: 24 }}>
          {/* profile header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 22 }}>
            <Avatar size={104} ring />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><div style={{ fontSize: 24 }}>@somchai.travels</div><Btn sm>Edit profile</Btn><Btn solid sm>Share</Btn></div>
              <div style={{ display: 'flex', gap: 26, fontSize: 16 }}><span><b>18</b> trips</span><span><b>4,210</b> followers</span><span><b>312</b> following</span></div>
              <Bars lines={2} w={['340px', '220px']} h={9} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}><Chip dot={false} accent>Trips</Chip><Chip dot={false}>Albums</Chip><Chip dot={false}>Saved</Chip><Chip dot={false}>Map</Chip></div>
          {/* trip grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            <TripCard live /><TripCard /><TripCard forked /><TripCard />
          </div>
        </div>
      </div>
      <Note style={{ right: 60, top: 96 }} arrow="right">IG-style profile;<br />trips replace the<br />photo grid</Note>
    </IPad>
  );
}

function ProfB() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar active="Trips" />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* map of travels */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MapBg label="every place @somchai has been" route={false}>
              {[['22%', '40%'], ['30%', '30%'], ['44%', '50%'], ['52%', '36%'], ['60%', '60%'], ['70%', '44%'], ['78%', '56%'], ['38%', '64%']].map(([x, y], i) => <Pin key={i} x={x} y={y} n="" accent={i % 2 === 0} size={18} />)}
              <div className="sk" style={{ position: 'absolute', left: 18, top: 18, background: 'var(--paper)', padding: '8px 14px', fontSize: 15 }}>14 countries · 38 cities</div>
            </MapBg>
          </div>
          {/* trips list */}
          <div style={{ width: 400, borderLeft: '2px solid var(--ink)', background: 'var(--panel)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Avatar size={56} ring /><div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><div style={{ fontSize: 19 }}>@somchai.travels</div><span style={{ color: 'var(--sub)', fontSize: 14 }}>4,210 followers · 18 trips</span></div></div>
            <Btn solid full sm>Follow</Btn>
            <div style={{ fontSize: 16 }}>Trips</div>
            <TripCard live /><TripCard forked />
          </div>
        </div>
      </div>
      <Note style={{ left: 200, top: 120 }} arrow="down">profile = a map of<br />where they've been</Note>
    </IPad>
  );
}

Object.assign(window, { AlbumA, AlbumB, BookA, BookB, ProfA, ProfB });
