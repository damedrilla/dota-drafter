import React, { useState, useEffect, useRef } from 'react';
import { Users, Cpu } from 'lucide-react';

// Pre-load all hero icons and loop videos at build time
const iconModules = import.meta.glob('../assets/hero_icons/*.png', { eager: true });
const loopModules = import.meta.glob('../assets/loops/*.webm', { eager: true });

const TeamDraftColumn = ({ teamName, picks, bans, isRadiant, activeTeam, playerTeam, config, draftOrder = [], draftIndex = 0, activePhase = null, timerDisplay = '' }) => {
  const isMyTurn = activeTeam === (isRadiant ? 'radiant' : 'dire');
  const isPlayerTeam = playerTeam === (isRadiant ? 'radiant' : 'dire');

  const teamKey = isRadiant ? 'radiant' : 'dire';
  const teamBansPhases = (draftOrder || []).filter(e => e.team === teamKey && e.type === 'ban').map(e => e.phase);
  const teamPicksPhases = (draftOrder || []).filter(e => e.team === teamKey && e.type === 'pick').map(e => e.phase);

  return (
    <div className={`flex flex-col w-48 md:w-64 h-full border-x border-gray-800 ${isRadiant ? 'items-end' : 'items-start'} ${isRadiant ? 'bg-gradient-to-r from-green-900/30 to-transparent' : 'bg-gradient-to-l from-red-900/30 to-transparent'}`}>
      <div className={`w-full p-4 flex flex-col ${isRadiant ? 'items-end' : 'items-start'} ${isMyTurn ? 'bg-white/5' : ''}`}>
        <h2 className={`text-2xl font-bold font-reaver tracking-widest uppercase flex items-center gap-2 ${isRadiant ? 'text-green-400' : 'text-red-500'} ${isRadiant ? 'flex-row-reverse' : 'flex-row'}`}>
          {teamName}
          {isPlayerTeam ? <Users size={16} className="text-white" /> : <Cpu size={16} className="text-white" />}
        </h2>
        {isMyTurn && <div className="text-xs text-yellow-400 font-radiance animate-pulse mt-1">TURN TO DRAFT</div>}
      </div>

      <div className="flex-1 w-full px-2 space-y-2 overflow-y-auto py-4">
        {[0, 1, 2, 3, 4].map((i) => {
            const hero = picks[i];
            const playerName = isRadiant ? config.radiantPlayers[i] : config.direPlayers[i];
            const phaseNum = teamPicksPhases[i];
            return (
              <div key={i} className={
                `relative h-16 md:h-20 w-full border border-gray-700 bg-gray-800/50 flex items-center justify-center overflow-hidden shadow-inner group
                ${isRadiant ? 'flex-row-reverse' : 'flex-row'}
                ${phaseNum === activePhase && activeTeam === teamKey ? 'ring-2 ring-yellow-400/30' : ''}`
              }>
                {/* Phase badge (top-left) */}
                <div className="absolute top-1 left-1 z-20 flex items-center gap-1">
                  {phaseNum ? (
                    <div className={`text-[10px] px-2 py-0.5 rounded bg-black/60 text-gray-200 ${phaseNum === activePhase && activeTeam === teamKey ? 'ring-1 ring-yellow-400' : ''}`}>
                      {phaseNum}
                    </div>
                  ) : null}
                </div>

                {hero ? (
                  <DraftSlot hero={hero} playerName={playerName} isRadiant={isRadiant} />
                 ) : (
                   <>
                    {/* Background video loop when slot is empty (portrait video fit by width) */}
                    {(() => {
                      const loopKey = '../assets/loops/logo_loop_major.webm';
                      const loopSrc = loopModules[loopKey]?.default || `/loops/logo_loop_major.webm`;
                      const isActive = (phaseNum === activePhase && activeTeam === teamKey);
                      return (
                        <video
                          src={loopSrc}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          style={{ filter: isActive ? 'none' : 'grayscale(100%)' }}
                        />
                      );
                    })()}

                    <div className="text-gray-600 text-3xl font-thin opacity-20 z-10">?</div>
                    {playerName && <div className={`absolute bottom-1 ${isRadiant ? 'left-2' : 'right-2'} text-[10px] text-gray-600 z-10`}>{playerName}</div>}
                   </>
                )}

                {/* Active-phase centered timer overlay */}
                {phaseNum === activePhase && activeTeam === teamKey && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div className="inline-flex items-center justify-center text-5xl font-bold rounded-md px-3 py-1 md:text-base shadow-2xl ring-4 ring-yellow-400/30 animate-pulse">
                      {timerDisplay}
                    </div>
                  </div>
                )}
              </div>
            );
        })}
      </div>

      <div className="w-full p-2 grid grid-cols-4 gap-1 border-t border-gray-800 bg-black/40">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const bannedHero = bans[i];
            const phaseNum = teamBansPhases[i];
            return (
              <div key={i} className={`relative w-full pt-[75%] bg-gray-900 border border-gray-700 ${phaseNum === activePhase && activeTeam === teamKey ? 'ring-2 ring-yellow-400/30' : ''}`}>
                {/* Phase badge (top-left) */}
                <div className="absolute top-1 left-1 z-20 flex items-center gap-1">
                  {phaseNum ? (
                    <div className={`text-[10px] px-2 py-0.5 rounded bg-black/60 text-gray-200 ${phaseNum === activePhase && activeTeam === teamKey ? 'ring-1 ring-yellow-400' : ''}`}>
                      {phaseNum}
                    </div>
                  ) : null}
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  {bannedHero ? (
                    <>
                       {(() => {
                         const iconKey = `../assets/hero_icons/${bannedHero.id}.png`;
                         const src = iconModules[iconKey]?.default || `/hero_icons/${bannedHero.id}.png`;
                         return <img src={src} alt={bannedHero.name} className="absolute inset-0 w-full h-full object-cover" draggable={false} onError={(e)=>{e.currentTarget.style.display='none'}} />;
                       })()}
                        <div className="absolute inset-0 bg-black/50" />
                        <span className="relative z-10 text-[6px] md:text-[8px] text-center leading-none text-gray-300 overflow-hidden px-0.5">{bannedHero.name}</span>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                           <div className="w-full h-0.5 bg-red-600/80 rotate-45 absolute" />
                           <div className="w-full h-0.5 bg-red-600/80 -rotate-45 absolute" />
                        </div>
                    </>
                  ) : null}
                </div>

                {/* Active-phase centered timer overlay for bans */}
                {phaseNum === activePhase && activeTeam === teamKey && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div className="inline-flex items-center justify-center bg-yellow-500 text-black font-bold rounded-md px-3 py-1 text-sm md:text-base shadow-2xl ring-4 ring-yellow-400/30 animate-pulse">
                      {timerDisplay}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  );
};

/**
 * Small helper: extract a dominant/average color from an image URL.
 * Returns an rgba(...) string or throws on failure.
 */
async function getDominantColorFromImage(url) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        try {
          // sample at reduced resolution for speed
          const w = Math.min(100, img.width);
          const h = Math.min(100, img.height);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let r = 0, g = 0, b = 0, count = 0;
          // sample every 4th pixel to be faster
          for (let i = 0; i < data.length; i += 16) {
            const alpha = data[i + 3];
            if (alpha < 40) continue; // ignore mostly transparent pixels
            const pr = data[i], pg = data[i + 1], pb = data[i + 2];
            // skip near-black/near-white heavy areas? still include; averaging handles it
            r += pr; g += pg; b += pb; count++;
          }
          if (count === 0) return reject(new Error('no pixels'));
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          resolve(`rgba(${r}, ${g}, ${b}, 0.9)`);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (e) => reject(e);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Per-slot component so we can use hooks inside the loop.
 */
function DraftSlot({ hero, playerName, isRadiant }) {
  const [dominant, setDominant] = useState(null);
  const mounted = useRef(true);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    mounted.current = true;
    setDominant(null);
    setEntered(false);
    if (!hero) return () => { mounted.current = false; };

    // try local path first (same as original)
    const src1 = `/hero_icons/${hero.id}.png`;
    const src2 = `/assets/hero_icons/${hero.id}.png`;

    // try to get dominant color, fallback to attr color
    getDominantColorFromImage(src1)
      .catch(() => getDominantColorFromImage(src2))
      .then((c) => {
        if (mounted.current) setDominant(c);
      })
      .catch(() => {
        // ignore; will use attr color fallback
      });

    return () => { mounted.current = false; };
  }, [hero]);

  useEffect(() => {
    if (!hero) return setEntered(false);
    // trigger entrance on next frame so transition runs
    let raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [hero]);

  // fallback attribute color
  const attrColor =
    hero?.attr === 'str' ? 'rgba(127,29,29,0.95)' :
    hero?.attr === 'agi' ? 'rgba(6,95,70,0.95)' :
    'rgba(30,58,138,0.95)';

  const fadeColor = dominant || attrColor;
  const dir = isRadiant ? 'to right' : 'to left';

  return (
    <>
      <div className={`absolute inset-0 opacity-100`} style={{ background: fadeColor }} />

      {/* full-height fixed-position hero image with directional fade (doesn't affect text flow) */}
      <div className={`absolute inset-y-0 ${isRadiant ? 'left-0' : 'right-0'} w-28 overflow-hidden pointer-events-none`}>
        {(() => {
          const iconKey = `../assets/hero_icons/${hero.id}.png`;
          const src = iconModules[iconKey]?.default || `/hero_icons/${hero.id}.png`;
          return <img src={src} alt={hero.name} className="h-full w-full object-cover" draggable={false} onError={(e)=>{e.currentTarget.style.display='none'}} />;
        })()}

        {/* directional gradient using dominant/fallback color */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(${dir}, rgba(0,0,0,0), ${fadeColor})` }} />
      </div>

      {/* content area has padding so text doesn't overlap the fixed image */}
      <div className={`z-10 flex items-center w-full px-3 justify-between `}>
        <div className={`${isRadiant ? 'text-right' : 'text-left'} flex-1 ${isRadiant ? 'pr-3' : 'pl-3'}`}>
          <div className={`font-bold text-sm md:text-lg tracking-wider font-reaver uppercase transform transition duration-500 ${entered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'}`}>
            {hero.name}
          </div>
          {playerName && (
            <div className={`text-[10px] text-gray-300 font-radiance font-light transform transition duration-500 delay-150 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
              {playerName}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default TeamDraftColumn;