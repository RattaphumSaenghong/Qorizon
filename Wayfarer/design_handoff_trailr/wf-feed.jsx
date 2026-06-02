// wf-feed.jsx — Home Feed, 3 approaches. Instagram-ref, location-embedded.

// Shared: one feed post card
function FeedCard({ n = 1, big = true }) {
  return (
    <div className="sk" style={{ background: 'var(--paper)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar size={38} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 10, width: 110, background: 'var(--bar)', borderRadius: 5 }} />
          <Chip dot accent style={{ fontSize: 12, padding: '1px 8px' }}>Wat Arun · Bangkok</Chip>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--sub)', fontSize: 20 }}>⋯</span>
      </div>
      <Ph label="[ trip photo ]" style={{ height: big ? 280 : 200, width: '100%' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 22, color: 'var(--ink)' }}>
        <span>♡</span><span>▢</span><span>↗</span><div style={{ flex: 1 }} /><span>▽</span>
      </div>
      <Bars lines={2} w={['95%', '60%']} h={9} />
    </div>
  );
}

function FeedA() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar active="Feed" />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* feed column */}
          <div style={{ width: 540, borderRight: '2px solid var(--ink)', padding: 20, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip dot={false} accent>Following</Chip><Chip dot={false}>Nearby</Chip><Chip dot={false}>For you</Chip>
            </div>
            <FeedCard n={1} />
            <FeedCard n={2} big={false} />
          </div>
          {/* live map */}
          <div style={{ flex: 1, position: 'relative' }}>
            <MapBg label="Mapbox · posts on map">
              <Pin x="34%" y="38%" n="1" accent />
              <Pin x="58%" y="30%" n="2" />
              <Pin x="70%" y="60%" n="3" />
              <Pin x="44%" y="68%" n="4" />
              {/* mini preview anchored to a pin */}
              <div className="sk" style={{ position: 'absolute', left: '58%', top: '30%', transform: 'translate(-50%, -130%)', background: 'var(--paper)', padding: 8, width: 150, display: 'flex', gap: 8 }}>
                <Ph style={{ width: 44, height: 44 }} sk={false} />
                <Bars lines={2} w={['100%', '70%']} h={7} style={{ flex: 1, justifyContent: 'center' }} />
              </div>
              <div className="sk" style={{ position: 'absolute', right: 16, top: 16, background: 'var(--paper)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 14 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--acc)' }} /> 12 friends posting now</div>
            </MapBg>
            <Note style={{ right: 24, bottom: 70, textAlign: 'right' }} arrow="down">posts pin to where<br />they were taken</Note>
          </div>
        </div>
      </div>
      <Note style={{ left: 600, top: 96, textAlign: 'left' }} arrow="left">tap any post →<br />opens the full<br />trip journal</Note>
    </IPad>
  );
}

function FeedB() {
  return (
    <IPad>
      <div style={{ display: 'flex', height: '100%' }}>
        <Rail active={0} />
        <div style={{ flex: 1, position: 'relative' }}>
          <MapBg label="Mapbox · immersive discovery" style={{ height: '100%' }}>
            <Pin x="30%" y="34%" n="1" accent />
            <Pin x="52%" y="26%" n="2" />
            <Pin x="66%" y="46%" n="3" />
            <Pin x="40%" y="58%" n="4" />
            <Pin x="78%" y="64%" n="5" />
            {/* floating search */}
            <div className="sk" style={{ position: 'absolute', left: 24, top: 22, background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', width: 360, color: 'var(--sub)', fontSize: 16 }}><span>⌕</span> Explore Chiang Mai</div>
            {/* filter chips */}
            <div style={{ position: 'absolute', left: 24, top: 76, display: 'flex', gap: 8 }}>
              <Chip dot={false} accent>Food</Chip><Chip dot={false}>Cafés</Chip><Chip dot={false}>Stays</Chip><Chip dot={false}>Viewpoints</Chip>
            </div>
            {/* bottom carousel of place cards anchored to pins */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 20px 20px', display: 'flex', gap: 14, overflow: 'hidden' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="sk" style={{ width: 230, flex: '0 0 auto', background: 'var(--paper)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Ph label={i === 1 ? '[ place photo ]' : ''} style={{ height: 120 }} sk={false} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar size={26} /><Bars lines={1} w={['80%']} h={8} style={{ flex: 1 }} /></div>
                  <Chip dot accent style={{ fontSize: 12, alignSelf: 'flex-start' }}>2.3km away</Chip>
                </div>
              ))}
            </div>
          </MapBg>
          <Note style={{ left: 430, top: 78 }} arrow="left">map IS the feed —<br />swipe cards, tap pins</Note>
        </div>
      </div>
    </IPad>
  );
}

function FeedC() {
  return (
    <IPad>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TopBar active="Explore" />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* explore grid */}
          <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Chip dot={false} accent>Trending</Chip><Chip dot={false}>Thailand</Chip><Chip dot={false}>Japan</Chip><Chip dot={false}>Food</Chip><Chip dot={false}>Hidden gems</Chip>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 150, gap: 10 }}>
              <Ph label="[ photo ]" style={{ gridRow: 'span 2', gridColumn: 'span 2', height: '100%' }} />
              <Ph style={{ height: '100%' }} /><Ph style={{ height: '100%' }} />
              <Ph style={{ height: '100%' }} /><Ph label="[ reel ]" style={{ height: '100%' }} />
              <Ph style={{ height: '100%' }} /><Ph style={{ height: '100%' }} /><Ph style={{ height: '100%' }} /><Ph style={{ height: '100%' }} />
            </div>
          </div>
          {/* context rail: selected + map snippet */}
          <div style={{ width: 360, borderLeft: '2px solid var(--ink)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--panel)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar size={36} /><div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><div style={{ height: 9, width: 120, background: 'var(--bar)', borderRadius: 5 }} /><div style={{ height: 8, width: 80, background: 'var(--bar)', borderRadius: 5 }} /></div></div>
            <Ph label="[ selected post ]" style={{ height: 200, background: 'var(--paper)' }} />
            <MapBg label="where" route={false} style={{ height: 130 }}><Pin x="50%" y="55%" n="" accent size={22} /></MapBg>
            <Btn solid full>Save to a trip</Btn>
            <div style={{ fontSize: 15, color: 'var(--sub)' }}>More near here</div>
            <div style={{ display: 'flex', gap: 8 }}><Ph style={{ height: 64, flex: 1 }} sk={false} /><Ph style={{ height: 64, flex: 1 }} sk={false} /><Ph style={{ height: 64, flex: 1 }} sk={false} /></div>
          </div>
        </div>
      </div>
      <Note style={{ left: 250, top: 150 }} arrow="down">Pinterest/IG grid →<br />tap any tile, context<br />opens on the right</Note>
    </IPad>
  );
}

Object.assign(window, { FeedA, FeedB, FeedC });
