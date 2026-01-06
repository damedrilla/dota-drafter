import { useEffect, useState } from 'react';

// assets
// Assuming these imports remain the same and provide hero icons and loop videos
const iconModules = import.meta.glob('../assets/hero_icons/*.png', { eager: true });
const loopModules = import.meta.glob('../assets/loops/*.webm', { eager: true });

// --- IconOrName component (No change, good for rendering hero icons) ---
const IconOrName = ({ hero, size = 'w-20 h-20' }) => {
  const id = hero?.id || hero?.name;
  const key = `../assets/hero_icons/${id}.png`;
  const src = iconModules[key]?.default || `/hero_icons/${id}.png`;
  return (
    <div className={`overflow-hidden ${size} bg-black/20 border border-gray-800 rounded`}> 
      {src ? <img src={src} alt={hero?.name} className="w-full h-full object-cover" draggable={false} /> : (
        <div className="w-full h-full flex items-center justify-center text-xs text-gray-200 px-1">{hero?.name || ''}</div>
      )}
    </div>
  );
};

// --- BanSlot component (Styled to be thinner and vertical for the layout) ---
const BanSlot = ({ hero, isCurrentBan }) => (
  <div className={`w-16 h-10 bg-black/40 border border-gray-800 flex items-end justify-center relative overflow-hidden transition-all duration-300 ${hero ? 'brightness-100' : 'brightness-75'} ${isCurrentBan ? 'shadow-lg shadow-yellow-600/50' : ''}`}>
    {hero ? (
      <>
        {/* Icon (small, centered at the bottom) */}
        <div className="w-full h-full flex items-end justify-center pb-0.5">
          <IconOrName hero={hero} size={'w-14 h-8'} />
        </div>
        {/* Ban Mark (Red X) */}
        <div className="absolute top-0 bottom-0 left-0 right-0 flex items-center justify-center opacity-80">
          <div className="w-8 h-[3px] bg-red-600 rotate-45" />
          <div className="w-8 h-[3px] bg-red-600 -rotate-45 absolute" />
        </div>
      </>
    ) : (
      <div className="text-gray-600 text-[10px] mb-1">BAN</div>
    )}
  </div>
);

// --- PickSlot component (Used for the 5 smaller pick slots in the middle) ---
const PickSlot = ({ hero, isActive, loopSrc, team = 'radiant' }) => {
  const activeClass = isActive 
    ? (team === 'dire' ? 'ring-4 ring-blue-500/80 shadow-lg shadow-blue-500/50' : 'ring-4 ring-red-500/80 shadow-lg shadow-red-500/50')
    : 'grayscale opacity-70';

  return (
    <div className={`w-28 h-28 bg-black/40 border border-gray-800 overflow-hidden flex items-center justify-center relative transition-all duration-300 ${activeClass}`}>
      {hero ? (
        // Renders hero icon if picked
        <IconOrName hero={hero} size={'w-28 h-28'} />
      ) : (
        // Renders the loop if active, otherwise a placeholder
        isActive && loopSrc ? (
          <video src={loopSrc} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-500 text-3xl">?</div>
        )
      )}
    </div>
  );
};

// --- Main Hero Portrait component (For the large, active pick display) ---
const BigHeroPortrait = ({ hero, isActive, team = 'radiant', loopSrc }) => {
    const activeClass = isActive 
        ? (team === 'dire' ? 'ring-4 ring-blue-500 shadow-xl shadow-blue-500/70' : 'ring-4 ring-red-500 shadow-xl shadow-red-500/70')
        : '';
    const nameColor = team === 'dire' ? 'text-blue-400' : 'text-red-400';
    
    return (
        <div className={`w-40 h-56 relative overflow-hidden transition-all duration-300 ${activeClass}`}>
            {/* Background image/video */}
            <div className="w-full h-full bg-black/50">
                {hero ? (
                    // Render big hero image (using IconOrName for consistent hero fetching, but custom size)
                    <IconOrName hero={hero} size={'w-40 h-56'} />
                ) : (
                    // Active loop for picking
                    isActive && loopSrc ? (
                        <video src={loopSrc} autoPlay loop muted playsInline className="w-full h-full object-cover filter brightness-75" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl">PICK</div>
                    )
                )}
            </div>
            
            {/* Hero Name/Team Name Overlay */}
            <div className={`absolute bottom-0 left-0 right-0 p-1 bg-black/70 text-center ${nameColor}`}>
                <span className="font-bold text-sm uppercase">{hero?.name || team}</span>
            </div>
        </div>
    );
};


// --- Draft Timeline Component (Simple visual representation of the draft phases) ---
const DraftTimeline = ({ draftOrder = [], activePhase, activeTeam }) => {
    // Only show up to 12 slots (6 picks, 6 bans for both sides) for visual simplicity
    const displayPhases = draftOrder.slice(0, 24); 

    return (
        <div className="flex items-center justify-center w-full my-6">
            <div className="w-1/3 text-right text-xs text-white pr-2">BAN</div>
            <div className="flex items-center relative w-1/3">
                <div className="absolute w-full h-[1px] bg-gray-600 top-1/2 -translate-y-1/2"></div>
                {displayPhases.map((step, index) => {
                    const isActive = step.phase === activePhase;
                    const isPick = step.type === 'pick';
                    const isDire = step.team === 'dire';

                    let colorClass = isPick ? 'bg-yellow-400' : 'bg-gray-400';
                    let sizeClass = isPick ? 'w-2 h-2' : 'w-1 h-1';
                    
                    if (isDire) {
                        colorClass = isPick ? 'bg-blue-600' : 'bg-gray-400';
                    } else {
                         colorClass = isPick ? 'bg-red-600' : 'bg-gray-400';
                    }

                    if (isActive) {
                        colorClass = 'bg-yellow-400 ring-2 ring-white/50';
                        sizeClass = isPick ? 'w-3 h-3' : 'w-2 h-2';
                    }
                    
                    return (
                        <div 
                            key={index} 
                            className={`z-10 rounded-full mx-1 transition-all duration-300 ${colorClass} ${sizeClass}`}
                        ></div>
                    );
                })}
            </div>
            <div className="w-1/3 text-left text-xs text-white pl-2">PICK</div>
        </div>
    );
};


const LiveDraft = () => {
  const [state, setState] = useState({
    radiantState: { picks: [], bans: [] },
    direState: { picks: [], bans: [] },
    draftOrder: [],
    draftIndex: 0,
    config: {},
    activePhase: null,
    activeTeam: null,
    timerDisplay: ''
  });

  useEffect(() => {
    // Try to initialize state from multiple sources:
    // 1. If the page was opened with state in the URL hash (browser), read and use it
    // 2. If main process sent an init via IPC, subscribe to it
    // 3. Fallback to window.__LIVE_INIT__ if set
    let off = null;
    try {
      const hash = window.location.hash || '';
      const parts = hash.split('?data=');
      if (parts && parts[1]) {
        try {
          const decoded = decodeURIComponent(parts[1]);
          const parsed = JSON.parse(decoded);
          setState(prev => ({ ...prev, ...parsed }));
          // if we found hash data, skip IPC subscription (static snapshot)
          return () => {};
        } catch (e) {
          // ignore parse errors and continue to IPC path
        }
      }
    } catch (e) { /* ignore */ }

    if (window?.electronAPI?.onInitLive) {
      off = window.electronAPI.onInitLive((data) => {
        setState(prev => ({ ...prev, ...data }));
      });
    } else {
      try { if (window.__LIVE_INIT__) setState(prev => ({ ...prev, ...window.__LIVE_INIT__ })); } catch (e) {}
    }
    return () => { if (typeof off === 'function') off(); };
  }, []);

  const { radiantState, direState, config, draftOrder = [], activePhase, activeTeam, timerDisplay } = state;
  const { reserveTime = { radiant: 0, dire: 0 } } = state;

  // compute per-team pick/ban phase lists (used for index mapping)
  const radiantPickPhases = (draftOrder || []).filter(e => e.team === 'radiant' && e.type === 'pick').map(e => e.phase);
  const direPickPhases = (draftOrder || []).filter(e => e.team === 'dire' && e.type === 'pick').map(e => e.phase);
  const radiantBanPhases = (draftOrder || []).filter(e => e.team === 'radiant' && e.type === 'ban').map(e => e.phase);
  const direBanPhases = (draftOrder || []).filter(e => e.team === 'dire' && e.type === 'ban').map(e => e.phase);

  // select loop asset
  const loopKey = '../assets/loops/logo_loop_major.webm';
  const loopSrc = loopModules[loopKey]?.default || `/loops/logo_loop_major.webm`;

  // Determine the active pick index for the Big Portrait display
  const activeOrderIndex = draftOrder.findIndex(d => d.phase === activePhase);
  const currentAction = draftOrder[activeOrderIndex];
  const isPick = currentAction?.type === 'pick';

  // For the large portrait, display the current active pick/ban hero, or the *last* hero if the next action is a ban
  // For simplicity, we'll try to display the current active pick hero in the large portrait if it's a pick phase.
  let direBigHero = null;
  let radiantBigHero = null;
  let isDireBigActive = false;
  let isRadiantBigActive = false;
  
  // Dire Pick Logic (Match Dire Pick #2 in the image)
  if (activeTeam === 'dire' && isPick) {
      const pickIndex = direPickPhases.findIndex(p => p === activePhase);
      direBigHero = (direState.picks || [])[pickIndex]; // Will be null before pick completes
      isDireBigActive = true;
  } else {
      // If it's not the dire's pick, show their last pick for continuity (or first pick)
      direBigHero = (direState.picks || [])[ (direState.picks||[]).length - 1 ]; 
      // If the last pick is the active pick, show it even after the pick is complete if it's the last action
      if (activeOrderIndex > 0 && draftOrder[activeOrderIndex - 1]?.type === 'pick' && draftOrder[activeOrderIndex - 1]?.team === 'dire') {
          direBigHero = (direState.picks || [])[ (direState.picks||[]).length - 1 ];
      }
  }

  // Radiant Pick Logic
  if (activeTeam === 'radiant' && isPick) {
      const pickIndex = radiantPickPhases.findIndex(p => p === activePhase);
      radiantBigHero = (radiantState.picks || [])[pickIndex]; // Will be null before pick completes
      isRadiantBigActive = true;
  } else {
      // If it's not the radiant's pick, show their last pick for continuity
      radiantBigHero = (radiantState.picks || [])[ (radiantState.picks||[]).length - 1 ];
  }


  return (
    // Outer container: dark background, full screen
    <div className="w-screen h-screen bg-[#020203] flex items-center justify-center relative font-sans text-white">
        
        {/* Header (Top Text/Title) */}
        <div className="absolute top-4 left-4 text-xs uppercase text-gray-400">
            THE INTERNATIONAL 2015
            <div className="text-white text-base">"Who will emerge victorious?" Witness the world's top teams battle</div>
        </div>
        
        {/* Draft Container (The main action area, centered) */}
        <div className="relative w-full max-w-6xl h-[600px] bg-black/70 shadow-2xl shadow-black/50 border-t border-b border-gray-800">
            
            {/* Left Section (Radiant Bans & Info) */}
            <div className="absolute top-0 left-0 h-full w-48 p-4 flex flex-col items-start justify-between">
                
                {/* Radiant Bans (Vertical) */}
                <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-semibold text-gray-400 mb-1">BANS</div>
                    {Array.from({length: 6}).map((_, i) => (
                        <BanSlot 
                            key={`rb-${i}`} 
                            hero={(radiantState.bans || [])[i]} 
                            isCurrentBan={radiantBanPhases[i] === activePhase && activeTeam === 'radiant'} 
                        />
                    ))}
                </div>
                
                {/* Reserve Time / Team Info */}
                <div className="text-left mt-auto">
                    <div className="text-xl font-bold text-red-500 mb-1">{config.radiantName || 'RADIANT'}</div>
                    <div className="text-xs text-gray-400">RESERVE TIME</div>
                    <div className="text-lg font-mono">{formatReserve(reserveTime.radiant)}</div>
                </div>
            </div>

            {/* Right Section (Dire Bans & Info) */}
            <div className="absolute top-0 right-0 h-full w-48 p-4 flex flex-col items-end justify-between">
                
                {/* Dire Bans (Vertical) */}
                <div className="flex flex-col gap-1.5 items-end">
                    <div className="text-sm font-semibold text-gray-400 mb-1">BANS</div>
                    {Array.from({length: 6}).map((_, i) => (
                        <BanSlot 
                            key={`db-${i}`} 
                            hero={(direState.bans || [])[i]} 
                            isCurrentBan={direBanPhases[i] === activePhase && activeTeam === 'dire'} 
                        />
                    ))}
                </div>
                
                 {/* Reserve Time / Team Info */}
                <div className="text-right mt-auto">
                    <div className="text-xl font-bold text-blue-500 mb-1">{config.direName || 'DIRE'}</div>
                    <div className="text-xs text-gray-400">RESERVE TIME</div>
                    <div className="text-lg font-mono">{formatReserve(reserveTime.dire)}</div>
                </div>
            </div>
            
            {/* Center Section (Picks, Timer, Timeline) */}
            <div className="mx-48 h-full flex flex-col items-center justify-center">
                
                {/* Top Half: Dire Picks & Big Portrait */}
                <div className="w-full flex items-start justify-between p-4">
                    {/* Dire Big Portrait (Left Side) */}
                    <div className="flex items-start gap-4">
                        <BigHeroPortrait 
                            hero={direBigHero} 
                            isActive={isDireBigActive} 
                            team="dire" 
                            loopSrc={loopSrc}
                        />
                        {/* Dire Picks (5 slots) */}
                        <div className="flex gap-2">
                            {Array.from({length: 5}).map((_, i) => (
                                <PickSlot 
                                    key={`dp-${i}`} 
                                    hero={(direState.picks || [])[i]} 
                                    isActive={direPickPhases[i] === activePhase && activeTeam === 'dire'}
                                    loopSrc={loopSrc}
                                    team="dire"
                                />
                            ))}
                        </div>
                    </div>
                    
                    {/* Dire Team Name / Logo (Top Right) */}
                    <div className="flex flex-col items-end text-right">
                        <div className="text-2xl font-extrabold text-blue-400 uppercase tracking-widest">{config.direName || 'Dire Team'}</div>
                        <div className="text-sm text-gray-500">PICK #{(direState.picks || []).length + 1}</div>
                    </div>
                </div>

                {/* Center Bar (Timer & Timeline) */}
                <div className="w-full flex flex-col items-center justify-center py-4 bg-black/50 border-t border-b border-gray-800">
                    {/* Countdown Timer */}
                    <div className="text-7xl font-mono font-extrabold text-white mb-2">{timerDisplay || '0:00'}</div>
                    
                    {/* Draft Timeline Visual */}
                    <DraftTimeline 
                        draftOrder={draftOrder} 
                        activePhase={activePhase} 
                        activeTeam={activeTeam}
                    />
                </div>
                
                {/* Bottom Half: Radiant Picks & Big Portrait */}
                <div className="w-full flex items-end justify-between p-4">
                     {/* Radiant Team Name / Logo (Bottom Left) */}
                    <div className="flex flex-col items-start text-left">
                        <div className="text-2xl font-extrabold text-red-400 uppercase tracking-widest">{config.radiantName || 'Radiant Team'}</div>
                        <div className="text-sm text-gray-500">PICK #{(radiantState.picks || []).length + 1}</div>
                    </div>
                    
                    {/* Radiant Picks (5 slots) */}
                    <div className="flex items-end gap-4">
                        <div className="flex gap-2">
                            {Array.from({length: 5}).map((_, i) => (
                                <PickSlot 
                                    key={`rp-${i}`} 
                                    hero={(radiantState.picks || [])[i]} 
                                    isActive={radiantPickPhases[i] === activePhase && activeTeam === 'radiant'}
                                    loopSrc={loopSrc}
                                    team="radiant"
                                />
                            ))}
                        </div>
                        {/* Radiant Big Portrait (Right Side - similar to the image's Gyrocopter position) */}
                        <BigHeroPortrait 
                            hero={radiantBigHero} 
                            isActive={isRadiantBigActive} 
                            team="radiant" 
                            loopSrc={loopSrc}
                        />
                    </div>
                </div>
                
            </div>
            
        </div>
        
    </div>
  );
};

// --- formatReserve (No change) ---
function formatReserve(sec) {
  if (sec == null) return '0:00';
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, '0');
  return `${m}:${r}`;
}

export default LiveDraft;