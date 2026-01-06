import { useEffect, useState, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

const HeroSelection = ({ config, radiantPicks = [], direPicks = [], playerTeam, onBack, onDone }) => {
  // selections hold the final selection for each slot (null or hero object)
  const [radiantSelected, setRadiantSelected] = useState(Array(5).fill(null));
  const [direSelected, setDireSelected] = useState(Array(5).fill(null));
  const radiantAvailRef = useRef([...radiantPicks]); // mutable avail lists to make removals simple
  const direAvailRef = useRef([...direPicks]);
  const [busy, setBusy] = useState(false);

  // keep refs to latest selected arrays for up-to-date checks inside timeouts
  const radiantSelectedRef = useRef(radiantSelected);
  const direSelectedRef = useRef(direSelected);
  useEffect(() => { radiantSelectedRef.current = radiantSelected; }, [radiantSelected]);
  useEffect(() => { direSelectedRef.current = direSelected; }, [direSelected]);
  
  // store pending timeouts so they can be cleared on unmount
  const pendingTimersRef = useRef([]);
  useEffect(() => {
    return () => {
      pendingTimersRef.current.forEach(t => clearTimeout(t));
      pendingTimersRef.current = [];
    };
  }, []);

  // helper: pick random from avail
  const pickRandom = (arr) => arr.splice(Math.floor(Math.random() * arr.length), 1)[0];

  // human slot indices (assume first player in team is human)
  const humanIsRadiant = playerTeam === 'radiant';
  const humanSlotIndex = 0;

  // mark selection helper
  const setSelection = (team, idx, hero) => {
    if (team === 'radiant') {
      setRadiantSelected(prev => {
        const next = [...prev];
        next[idx] = hero;
        return next;
      });
    } else {
      setDireSelected(prev => {
        const next = [...prev];
        next[idx] = hero;
        return next;
      });
    }
  };

  // Start bot selection sequence for a team (skip already filled slots).
  // Picks are scheduled sequentially (chain) to avoid dropped/missed timeouts.
  const startBotsForTeam = (team) => {
    const availRef = team === 'radiant' ? radiantAvailRef : direAvailRef;
    const setSel = team === 'radiant' ? setRadiantSelected : setDireSelected;
    const selectedRef = team === 'radiant' ? radiantSelectedRef : direSelectedRef;
    // compute target empty slots snapshot (excluding human slot if applicable)
    const targetSlots = [];
    const current = selectedRef.current;
    for (let i = 0; i < 5; i++) {
      const isHumanSlot = (i === 0) && ((team === 'radiant' && humanIsRadiant) || (team === 'dire' && !humanIsRadiant));
      if (!isHumanSlot && !current[i]) targetSlots.push(i);
    }
    // limit picks to available drafted heroes
    const maxPicks = Math.min(targetSlots.length, Math.max(0, availRef.current.length));

    const pickOne = (index) => {
      if (index >= maxPicks) return;
      const delay = 600 + index * (600 + Math.floor(Math.random() * 700));
      const t = setTimeout(() => {
        if (availRef.current.length === 0) return;
        const hero = pickRandom(availRef.current);
        setSel(prev => {
          const next = [...prev];
          next[targetSlots[index]] = hero;
          return next;
        });
        // schedule next
        pickOne(index + 1);
      }, delay);
      pendingTimersRef.current.push(t);
    };

    // start chain
    pickOne(0);
  };

  // Opponent team picks independently (start right away)
  useEffect(() => {
    // start dire bots if player is radiant, or start radiant bots if player is dire
    const enemyTeam = humanIsRadiant ? 'dire' : 'radiant';
    startBotsForTeam(enemyTeam);
    // also start bots for the human team too but they wait until human picks (we'll call startBotsForTeam after human pick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When human picks, remove from avail and trigger own bots
  const handleHumanPick = (hero) => {
    if (busy) return;
    setBusy(true);
    // remove hero from availRef of player's team
    const availRef = humanIsRadiant ? radiantAvailRef : direAvailRef;
    // find and remove selected hero from availRef
    const idx = availRef.current.findIndex(h => h.id === hero.id);
    if (idx >= 0) availRef.current.splice(idx, 1);
    // set selection for human slot (index 0)
    setSelection(playerTeam, humanSlotIndex, hero);
    // trigger bots for same team after small delay
    const t = setTimeout(() => {
      startBotsForTeam(playerTeam);
      setBusy(false);
    }, 600);
    pendingTimersRef.current.push(t);
  };

  // Remove picked heroes from availability when bots pick as well (keep refs in sync)
  // Watch radiantSelected / direSelected to remove picked heroes from opposite avail (safeguard)
  useEffect(() => {
    // when a selection happens remove it from its team's availRef (if still present)
    radiantSelected.forEach(sel => {
      if (sel) {
        const idx = radiantAvailRef.current.findIndex(h => h.id === sel.id);
        if (idx >= 0) radiantAvailRef.current.splice(idx, 1);
      }
    });
    direSelected.forEach(sel => {
      if (sel) {
        const idx = direAvailRef.current.findIndex(h => h.id === sel.id);
        if (idx >= 0) direAvailRef.current.splice(idx, 1);
      }
    });
  }, [radiantSelected, direSelected]);

  // finish when all slots filled
  useEffect(() => {
    const allFilled = radiantSelected.every(Boolean) && direSelected.every(Boolean);
    if (allFilled) {
      // small delay for UX
      const t = setTimeout(() => {
        onDone?.({ radiantSelected, direSelected });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [radiantSelected, direSelected, onDone]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f1215] text-white font-sans overflow-hidden select-none">
      <header className="h-16 flex items-center px-6 border-b border-gray-800">
        <div onClick={onBack} className="text-gray-400 hover:text-white cursor-pointer flex items-center gap-2">
          <ArrowLeft size={16} /> Back
        </div>
        <div className="flex-1 text-center font-reaver text-lg">Hero Selection</div>
      </header>

      <main className="flex-1 p-6 flex gap-6">
        {/* Radiant column */}
        <div className="w-1/2 flex flex-col bg-gray-900/60 p-4 rounded">
          <h3 className="text-sm uppercase tracking-widest text-green-400 font-reaver">{config.radiantName}</h3>
          <div className="grid grid-cols-1 gap-3 mt-4">
            {Array.from({ length: 5 }).map((_, i) => {
              const sel = radiantSelected[i];
              const isHumanSlot = humanIsRadiant && i === humanSlotIndex;
              const playerName = (config.radiantPlayers && config.radiantPlayers[i]) || `Player ${i+1}`;
              return (
                <div key={i} className="p-3 bg-gray-800 border border-gray-700 rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-reaver uppercase">{sel ? sel.name : (isHumanSlot ? 'Your pick' : 'Waiting...')}</div>
                    <div className="text-xs text-gray-400">{playerName}</div>
                  </div>

                  {!sel && isHumanSlot ? (
                    <div className="flex gap-2">
                      {/* show buttons for each available hero from radiant picks */}
                      {radiantAvailRef.current.map(h => (
                        <button key={h.id} onClick={() => handleHumanPick(h)} className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs" disabled={busy}>
                          {h.name}
                        </button>
                      ))}
                    </div>
                  ) : sel ? (
                    <div className="text-sm font-bold">{sel.name}</div>
                  ) : (
                    <div className="text-xs text-gray-400">Bot thinking…</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dire column */}
        <div className="w-1/2 flex flex-col bg-gray-900/60 p-4 rounded">
          <h3 className="text-sm uppercase tracking-widest text-red-400 font-reaver">{config.direName}</h3>
          <div className="grid grid-cols-1 gap-3 mt-4">
            {Array.from({ length: 5 }).map((_, i) => {
              const sel = direSelected[i];
              const isHumanSlot = !humanIsRadiant && i === humanSlotIndex;
               const playerName = (config.direPlayers && config.direPlayers[i]) || `Player ${i+1}`;
              return (
                <div key={i} className="p-3 bg-gray-800 border border-gray-700 rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-reaver uppercase">{sel ? sel.name : (isHumanSlot ? 'Your pick' : 'Waiting...')}</div>
                    <div className="text-xs text-gray-400">{playerName}</div>
                  </div>

                  {!sel && isHumanSlot ? (
                    <div className="flex gap-2">
                      {direAvailRef.current.map(h => (
                        <button key={h.id} onClick={() => handleHumanPick(h)} className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs" disabled={busy}>
                          {h.name}
                        </button>
                      ))}
                    </div>
                  ) : sel ? (
                    <div className="text-sm font-bold">{sel.name}</div>
                  ) : (
                    <div className="text-xs text-gray-400">Bot thinking…</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HeroSelection;