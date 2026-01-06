import { useState, useEffect, useRef } from 'react';
import { Shield, Swords, MessageSquare, Map as MapIcon, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { pickHeroForBot, pickCounterBan } from '../utils/pickLogic';
import HEROES from '../data/heroes';
import HeroCard from '../components/HeroCard';
import TeamDraftColumn from '../components/TeamDraftColumn';

// Pre-load all sound files at build time
const soundModules = import.meta.glob('../assets/sounds/*.mp3', { eager: true });

const DRAFT_ORDER = [
  { phase: 1, type: 'ban', team: 'radiant' },
  { phase: 2, type: 'ban', team: 'dire' },
  { phase: 3, type: 'ban', team: 'dire' },
  { phase: 4, type: 'ban', team: 'radiant' },
  { phase: 5, type: 'ban', team: 'dire' },
  { phase: 6, type: 'ban', team: 'dire' },
  { phase: 7, type: 'ban', team: 'radiant' },
  { phase: 8, type: 'pick', team: 'radiant' },
  { phase: 9, type: 'pick', team: 'dire' },
  { phase: 10, type: 'ban', team: 'radiant' },
  { phase: 11, type: 'ban', team: 'radiant' },
  { phase: 12, type: 'ban', team: 'dire' },
  { phase: 13, type: 'pick', team: 'dire' },
  { phase: 14, type: 'pick', team: 'radiant' },
  { phase: 15, type: 'pick', team: 'radiant' },
  { phase: 16, type: 'pick', team: 'dire' },
  { phase: 17, type: 'pick', team: 'dire' },
  { phase: 18, type: 'pick', team: 'radiant' },
  { phase: 19, type: 'ban', team: 'radiant' },
  { phase: 20, type: 'ban', team: 'dire' },
  { phase: 21, type: 'ban', team: 'dire' },
  { phase: 22, type: 'ban', team: 'radiant' },
  { phase: 23, type: 'pick', team: 'radiant' },
  { phase: 24, type: 'pick', team: 'dire' },
];

const DRAFT_ORDER_2 = [
  { phase: 1, type: 'ban', team: 'dire' },
  { phase: 2, type: 'ban', team: 'radiant' },
  { phase: 3, type: 'ban', team: 'radiant' },
  { phase: 4, type: 'ban', team: 'dire' },
  { phase: 5, type: 'ban', team: 'radiant' },
  { phase: 6, type: 'ban', team: 'radiant' },
  { phase: 7, type: 'ban', team: 'dire' },
  { phase: 8, type: 'pick', team: 'dire' },
  { phase: 9, type: 'pick', team: 'radiant' },
  { phase: 10, type: 'ban', team: 'dire' },
  { phase: 11, type: 'ban', team: 'dire' },
  { phase: 12, type: 'ban', team: 'radiant' },
  { phase: 13, type: 'pick', team: 'radiant' },
  { phase: 14, type: 'pick', team: 'dire' },
  { phase: 15, type: 'pick', team: 'dire' },
  { phase: 16, type: 'pick', team: 'radiant' },
  { phase: 17, type: 'pick', team: 'radiant' },
  { phase: 18, type: 'pick', team: 'dire' },
  { phase: 19, type: 'ban', team: 'dire' },
  { phase: 20, type: 'ban', team: 'radiant' },
  { phase: 21, type: 'ban', team: 'radiant' },
  { phase: 22, type: 'ban', team: 'dire' },
  { phase: 23, type: 'pick', team: 'dire' },
  { phase: 24, type: 'pick', team: 'radiant' },
];

const DraftingGame = ({ config, onExit, onComplete }) => {
  const [playerTeam, setPlayerTeam] = useState(null);
  const [draftIndex, setDraftIndex] = useState(0);
  const [radiantState, setRadiantState] = useState({ picks: [], bans: [] });
  const [direState, setDireState] = useState({ picks: [], bans: [] });
  const [selectedHero, setSelectedHero] = useState(null);
  const [timer, setTimer] = useState(30);
  const [reserveTime, setReserveTime] = useState({ radiant: 130, dire: 130 });

  // system log state (shows in footer). Append plain strings.
  const [systemLog, setSystemLog] = useState([
    'Welcome to Captains Mode.'
  ]);
  const sysLogRef = useRef(null);

  const addSystemMessage = (msg) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSystemLog(prev => [...prev, `${msg}`]);
  };

  // --- Sound handling ---
  // files expected in assets/sounds/ (bundled via import.meta.glob)
  const SOUND_FILES = {
    ally_pick: '../assets/sounds/ally_pick.mp3',
    ally_ban: '../assets/sounds/ally_ban.mp3',
    enemy_pick: '../assets/sounds/enemy_pick.mp3',
    enemy_ban: '../assets/sounds/enemy_ban.mp3',
    t10: '../assets/sounds/10sec.mp3',
    t5: '../assets/sounds/5sec.mp3',
    reserve: '../assets/sounds/reserve.mp3'
  };
  const soundsRef = useRef({});
  // per-turn once-only flags for warning lines
  const playedFlagsRef = useRef({ t10: false, t5: false, reserve: false, prompt: false });

  // preload audio objects once using bundled modules
  useEffect(() => {
    Object.entries(SOUND_FILES).forEach(([k, filePath]) => {
      try {
        const src = soundModules[filePath]?.default || `/sounds/${k}.mp3`;
        const a = new Audio(src);
        a.preload = 'auto';
        a.volume = 0.9;
        soundsRef.current[k] = a;
      } catch (e) {
        // ignore missing files
      }
    });
  }, []);

  const playSound = async (key) => {
    try {
      const a = soundsRef.current[key];
      if (!a) return;
      // restart from start
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.then === 'function') p.catch(() => { });
    } catch (e) { }
  };
  // --- end sound handling ---

  // auto-scroll system log to bottom when new message arrives
  useEffect(() => {
    if (sysLogRef.current) {
      sysLogRef.current.scrollTop = sysLogRef.current.scrollHeight;
    }
  }, [systemLog]);

  // --- Coin toss / draft-order state ---
  const [draftOrder, setDraftOrder] = useState(DRAFT_ORDER);
  const [showCoinToss, setShowCoinToss] = useState(false);
  const [coinChoice, setCoinChoice] = useState(null); // 'heads' | 'tails'
  const [coinResult, setCoinResult] = useState(null); // 'heads' | 'tails'
  const [coinWon, setCoinWon] = useState(null); // true | false | null
  const [coinAnimating, setCoinAnimating] = useState(false);

  // when player chooses side, log it
  const handleChooseSide = (team) => {
    // start selection + show coin toss
    setPlayerTeam(team);
    setDraftIndex(0);
    setTimer(30);
    setReserveTime({ radiant: 130, dire: 130 });
    setDraftOrder(DRAFT_ORDER);
    setShowCoinToss(true);
    setCoinChoice(null);
    setCoinResult(null);
    setCoinWon(null);
    addSystemMessage(`Player chose side: ${team === 'radiant' ? config.radiantName : config.direName}`);
  };

  const rotateDraftOrderForFirst = (teamFirst) => {
    const idx = DRAFT_ORDER.findIndex(s => s.team === teamFirst);
    if (idx <= 0) {
      setDraftOrder(DRAFT_ORDER);
    } else {
      setDraftOrder(DRAFT_ORDER_2);
    }
  };

  const handleCoinPick = (choice) => {
    // start animation, clear previous result
    setCoinChoice(choice);
    setCoinResult(null);
    setCoinWon(null);
    setCoinAnimating(true);

    // animate then reveal result
    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = outcome === choice;
      setCoinResult(outcome);
      setCoinWon(won);
      setCoinAnimating(false);

      // after short reveal decide draft-first (if lost, bot decides now)
      setTimeout(() => {
        if (!won) {
          const botChoosesFirst = Math.random() < 0.5;
          const botTeam = playerTeam === 'radiant' ? 'dire' : 'radiant';
          const teamFirst = botChoosesFirst ? botTeam : playerTeam;
          rotateDraftOrderForFirst(teamFirst);
          setShowCoinToss(false);
        } else {
          // user will pick first/second in the overlay; keep overlay open
        }
      }, 700);
    }, 1200); // match the coin flip animation duration
  };

  // after user wins coin, they pick first / second -> log when they decide
  const handleUserPickFirst = (wantFirst) => {
    const teamFirst = wantFirst ? playerTeam : (playerTeam === 'radiant' ? 'dire' : 'radiant');
    rotateDraftOrderForFirst(teamFirst);
    setShowCoinToss(false);
    addSystemMessage(`${playerTeam === teamFirst ? 'You' : 'Bot'} chose to ${wantFirst ? 'go first' : 'go second'}.`);
  };

  const botThinkingRef = useRef(false);

  const currentStep = draftOrder[draftIndex];
  const isDraftComplete = !currentStep;
  const activeTeam = currentStep?.team;
  const activeAction = currentStep?.type;
  const isPlayerTurn = activeTeam === playerTeam && !isDraftComplete;

  // show reserve on main timer when main time runs out
  const activeReserve = activeTeam ? (reserveTime[activeTeam] ?? 0) : 0;
  const mainShowsReserve = timer <= 0;
  const reserveDisplay = `${Math.floor(activeReserve / 60)}:${String(activeReserve % 60).padStart(2, '0')}`;
  const activePhase = currentStep?.phase;
  const timerDisplay = mainShowsReserve ? reserveDisplay : String(timer);

  // Play prompt sound immediately when a new turn starts and reset per-turn flags
  useEffect(() => {
    if (isDraftComplete || !playerTeam || showCoinToss) return;
    // reset per-turn once-only flags
    playedFlagsRef.current = { t10: false, t5: false, reserve: false, prompt: false };

    const promptKey = (activeTeam === playerTeam)
      ? (activeAction === 'ban' ? 'ally_ban' : 'ally_pick')
      : (activeAction === 'ban' ? 'enemy_ban' : 'enemy_pick');

    // play prompt immediately for the new turn
    playSound(promptKey);
    playedFlagsRef.current.prompt = true;
  }, [draftIndex, activeTeam, activeAction, playerTeam, isDraftComplete, showCoinToss]);

  // --- BOT LOGIC ---
  useEffect(() => {
    if (isDraftComplete || !playerTeam || showCoinToss) return;

    if (!isPlayerTurn && !botThinkingRef.current) {
      botThinkingRef.current = true;

      // Determine maximum available time for the bot to think before auto-commit
      const totalAvailableSec = (timer > 0 ? timer : 0) + (reserveTime[activeTeam] ?? 0);
      const maxAvailableMs = Math.max(500, Math.floor(totalAvailableSec * 1000) - 400);

      // Chance to deep-think using reserve time
      const deepThinkChance = 0.50; // 25% of the time the bot will use more time
      const useDeepThink = Math.random() < deepThinkChance && maxAvailableMs > 2000;

      let thinkTime = 0;
      if (useDeepThink) {
        // pick a think time that may span into reserve but stays under the ceiling
        const minMs = Math.min(1500, maxAvailableMs - 200);
        const extra = Math.max(0, maxAvailableMs - minMs - 200);
        thinkTime = minMs + Math.floor(Math.random() * (extra + 1));
      } else {
        // normal quick think: 1-6s but capped by available time
        const quickMin = 1000;
        const quickMax = Math.min(6000, maxAvailableMs);
        thinkTime = quickMin + Math.floor(Math.random() * Math.max(1, quickMax - quickMin + 1));
      }

      // ensure at least a small delay
      thinkTime = Math.max(200, thinkTime);

      const botTimer = setTimeout(() => {
        // if timers expired and draft still active, fall back to immediate move
        if (!isDraftComplete) {
          makeBotMove();
        }
        botThinkingRef.current = false;
      }, thinkTime);
      return () => clearTimeout(botTimer);
    }
  }, [activeTeam, playerTeam, isDraftComplete, draftIndex, showCoinToss]);

  const makeBotMove = () => {
    const isBotRadiant = playerTeam === 'dire'; // if player is dire, bot is radiant
    const myState = isBotRadiant ? radiantState : direState;
    const enemyState = isBotRadiant ? direState : radiantState;
    const availableHeroes = HEROES.filter(h => !isHeroTaken(h));

    let chosenHero = null;
    // Use smarter pick/ban engine. Pass isCaptainsMode true when you want captain-mode ban behavior.
    if (activeAction === 'ban') {
      // in captains mode you could pass { isCaptainsMode: true } to prefer counter bans
      chosenHero = pickCounterBan(availableHeroes, enemyState.picks);
    } else {
      // allow pick behavior to prefer counter picks based on settings
      const preferCounter = config?.enableCounterPick ?? true;

      // Determine desired position for this pick based on team pick order.
      // Sequence (per your request): first pick -> pos2, second -> pos3, third -> pos1, fourth -> pos5, fifth -> pos4
      const pickPositionSequence = [2, 3, 1, 5, 4];
      const teamPicksPhases = (draftOrder || []).filter(e => e.team === activeTeam && e.type === 'pick').map(e => e.phase);
      const pickIndexForTeam = teamPicksPhases.findIndex(p => p === activePhase);
      const desiredPos = pickPositionSequence[pickIndexForTeam] || null;

      chosenHero = pickHeroForBot(availableHeroes, myState.picks, enemyState.picks, 'pick', { isCaptainsMode: true, preferCounter, desiredPos });
    }

    if (chosenHero) commitTurn(chosenHero);
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    // Pause timers while coin toss overlay is visible
    if (isDraftComplete || !playerTeam || showCoinToss) return;
    const interval = setInterval(() => {
      if (timer > 0) {
        setTimer(t => t - 1);
      } else {
        if (reserveTime[activeTeam] > 0) {
          setReserveTime(prev => ({ ...prev, [activeTeam]: prev[activeTeam] - 1 }));
        } else {
          const available = HEROES.filter(h => !isHeroTaken(h));
          const random = available[Math.floor(Math.random() * available.length)];
          commitTurn(random);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, reserveTime, activeTeam, isDraftComplete, playerTeam, showCoinToss]);

  const isHeroTaken = (hero) => {
    const all = [...radiantState.picks, ...radiantState.bans, ...direState.picks, ...direState.bans];
    return all.some(h => h.id === hero.id);
  };

  const handleHeroClick = (hero) => {
    if (isDraftComplete || !isPlayerTurn) return;
    if (isHeroTaken(hero)) return;
    setSelectedHero(hero);
  };

  const commitTurn = (hero) => {
    if (!hero) return;
    const updateFn = activeTeam === 'radiant' ? setRadiantState : setDireState;
    updateFn(prev => ({
      ...prev,
      [activeAction === 'ban' ? 'bans' : 'picks']: [...prev[activeAction === 'ban' ? 'bans' : 'picks'], hero]
    }));
    // Log the action to system log
    const teamName = activeTeam === 'radiant' ? (config.radiantName || 'Radiant') : (config.direName || 'Dire');
    const verb = activeAction === 'ban' ? 'banned' : 'picked';
    addSystemMessage(`${teamName} ${verb} ${hero.name}`);
    // play confirmation (optional): play same team/verb sound quickly on commit
    setSelectedHero(null);
    setTimer(30);
    setDraftIndex(prev => prev + 1);
  };

  // push live updates to an open live window (if present)
  useEffect(() => {
    try {
      if (window?.electronAPI?.updateLiveState) {
          const payload = { radiantState, direState, draftOrder, draftIndex, config, activePhase, timerDisplay, reserveTime };
        window.electronAPI.updateLiveState(payload).catch(() => {});
      }
    } catch (e) {}
  }, [radiantState, direState, draftIndex, activePhase, timerDisplay, config]);

  // when draft completes, notify parent to transition to hero selection
  useEffect(() => {
    if (isDraftComplete) {
      addSystemMessage('Draft complete.');
      const payload = { radiantPicks: radiantState.picks, direPicks: direState.picks, playerTeam };
      // small timeout to let UI settle
      const t = setTimeout(async () => {
        onComplete?.(payload);

        // attempt to export selected heroes (JSON + Lua) using main process API
        try {
          const allHeroes = [...radiantState.picks, ...direState.picks];
          // ensure we send hero ids (e.g. npc_dota_hero_*) as requested
          const heroIds = allHeroes.map(h => h.id || h.name);
          if (window?.electronAPI?.exportDraft) {
            const res = await window.electronAPI.exportDraft({ heroes: heroIds, outPath: config.exportPath });
            if (res?.ok) {
              addSystemMessage(`Exported draft to: ${res.files?.join(', ')}`);
            } else {
              addSystemMessage(`Export failed: ${res?.error || 'unknown'}`);
            }
          }
        } catch (e) {
          addSystemMessage(`Export error: ${e.message}`);
        }
      }, 600);
      return () => clearTimeout(t);
    }
  }, [isDraftComplete, radiantState, direState, config, playerTeam]);

  if (!playerTeam) {
    return (
      <div className="h-screen w-screen bg-[#0f1215] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0f1215] to-black z-0" />
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-green-900/20 to-transparent" />
        <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-red-900/20 to-transparent" />

        <div className="z-10 flex flex-col items-center gap-12 w-full max-w-4xl px-4">
          <button onClick={onExit} className="absolute top-8 left-8 text-gray-500 hover:text-white flex items-center gap-2 uppercase tracking-widest text-xs">
            <ArrowLeft size={16} /> Return to Menu
          </button>

          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 drop-shadow-2xl">
            Choose Your Side
          </h1>

          <div className="flex flex-col md:flex-row gap-8 md:gap-24 w-full justify-center">
            {/* Radiant Choice */}
            <button
              onClick={() => handleChooseSide('radiant')}
              className="group relative w-full md:w-80 h-48 md:h-96 bg-gradient-to-b from-gray-800 to-black border border-gray-700 hover:border-green-400 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-green-500/10 group-hover:bg-green-500/20 transition-all" />
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-green-500/30 blur-[60px] group-hover:bg-green-400/40 transition-all" />
              <Swords size={64} className="text-gray-400 group-hover:text-green-400 mb-6 transition-colors" />
              <h2 className="text-3xl font-bold text-gray-200 group-hover:text-white uppercase tracking-[0.2em] mb-2">{config.radiantName}</h2>
              <span className="text-xs text-green-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all">
                Play as {config.radiantName}
              </span>
            </button>

            {/* Dire Choice */}
            <button
              onClick={() => handleChooseSide('dire')}
              className="group relative w-full md:w-80 h-48 md:h-96 bg-gradient-to-b from-gray-800 to-black border border-gray-700 hover:border-red-500 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-red-500/10 group-hover:bg-red-500/20 transition-all" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-red-500/30 blur-[60px] group-hover:bg-red-400/40 transition-all" />
              <Shield size={64} className="text-gray-400 group-hover:text-red-500 mb-6 transition-colors" />
              <h2 className="text-3xl font-bold text-gray-200 group-hover:text-white uppercase tracking-[0.2em] mb-2">{config.direName}</h2>
              <span className="text-xs text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all">
                Play as {config.direName}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f1215] text-white font-sans overflow-hidden select-none">
      {/* Coin-toss overlay */}
      {showCoinToss && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md bg-[#0b0c0d] border border-yellow-400 rounded-lg p-6 text-center">
            <style>{`
              @keyframes coin-flip {
                0% { transform: rotateX(0) rotateY(0); }
                25% { transform: rotateX(180deg) rotateY(0); }
                50% { transform: rotateX(180deg) rotateY(180deg); }
                75% { transform: rotateX(360deg) rotateY(180deg); }
                100% { transform: rotateX(360deg) rotateY(360deg); }
              }
              .coin { perspective: 800px; }
              .coin-inner { width:96px; height:96px; border-radius:9999px; display:flex; align-items:center; justify-content:center; font-weight:700; }
              .coin-spin { animation: coin-flip 1.2s cubic-bezier(.2,.9,.2,1) both; transform-style: preserve-3d; }
            `}</style>

            {!coinChoice && (
              <>
                <div className="text-sm text-gray-300 mb-3">Coin toss — choose Heads or Tails</div>
                <div className="flex gap-4 justify-center">
                  <button onClick={() => handleCoinPick('heads')} className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded">Heads</button>
                  <button onClick={() => handleCoinPick('tails')} className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded">Tails</button>
                </div>
              </>
            )}

            {coinChoice && coinAnimating && (
              <>
                <div className="text-sm text-gray-300 mb-3">Flipping the coin...</div>
                <div className="coin mx-auto my-2">
                  <div className={`coin-inner bg-yellow-300 text-black ${coinAnimating ? 'coin-spin' : ''}`} style={{ boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.15)' }}>
                    {/* show a subtle H/T while spinning */}
                    <span className="text-sm">{coinChoice === 'heads' ? 'H' : 'T'}</span>
                  </div>
                </div>
              </>
            )}

            {coinChoice && !coinAnimating && coinWon === true && (
              <>
                <div className="text-yellow-900 font-bold mb-2">You won the toss!</div>
                <div className="text-sm text-gray-300 mb-4">Do you want your side to go first in the draft order?</div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => handleUserPickFirst(true)} className="px-4 py-2 bg-green-700 rounded font-bold">Go First</button>
                  <button onClick={() => handleUserPickFirst(false)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded">Go Second</button>
                </div>
                <div className="text-xs text-gray-400 mt-3">Result: {coinResult}</div>
              </>
            )}

            {coinChoice && !coinAnimating && coinWon === false && (
              <>
                <div className="text-yellow-900 font-bold mb-2">You lost the toss</div>
                <div className="text-sm text-gray-300 mb-3">Bot is deciding...</div>
                <div className="text-xs text-gray-400">Result: {coinResult}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-20 bg-gradient-to-r from-black via-gray-900 to-black border-b border-gray-800 flex items-center justify-between px-8 shrink-0 shadow-xl z-20 relative">
        <div className="flex flex-col items-end w-48">
          <div className="text-xs text-gray-400 tracking-widest uppercase">Reserve</div>
          <div className={`text-xl font-radiance ${activeTeam === 'radiant' && reserveTime.radiant < 30 ? 'text-red-500 animate-pulse' : 'text-gray-300'}`}>
            {Math.floor(reserveTime.radiant / 60)}:{String(reserveTime.radiant % 60).padStart(2, '0')}
          </div>
        </div>

        <div className="flex flex-col items-center flex-1">
          {!isDraftComplete ? (
            <>
              {/* Reworked centered timer with directional chevrons */}
              <div className="flex items-center gap-6">
                {/* Left action (shows when Radiant is the active side) */}
                <div className={`w-36 text-right ${activeAction == 'pick' ? 'text-green-400' : 'text-red-500'}`}>
                  {activeTeam === 'radiant' ? (
                    <div className="uppercase tracking-widest text-sm font-bold flex items-center justify-end mr-10">
                      <ChevronLeft size={50} className="mr-10" />
                      <span className="text-5xl">{(activeAction || '').toUpperCase()}</span>
                    </div>
                  ) : (
                    <div className="opacity-30 text-xs"> </div>
                  )}
                </div>

                {/* Central timer */}
                <div className={`text-5xl font-bold tracking-normal ${mainShowsReserve ? 'font-radiance' : 'font-reaver'} ${(mainShowsReserve ? activeReserve : timer) < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                  {mainShowsReserve ? reserveDisplay : timer}
                </div>

                {/* Right action (shows when Dire is the active side) */}
                <div className={`w-36 text-left ${activeAction == 'pick' ? 'text-green-400' : 'text-red-500'}`}>
                  {activeTeam === 'dire' ? (
                    <div className="uppercase tracking-widest text-sm font-bold flex items-center justify-start">
                      <span className="text-5xl ml-10 ">{(activeAction || '').toUpperCase()}</span>
                      <ChevronRight size={35} className="ml-10" />
                    </div>
                  ) : (
                    <div className="opacity-30 text-xs"> </div>
                  )}
                </div>
              </div>

              {/* Secondary line: active team name */}
              <div className="flex items-center gap-2 mt-1">
                <span className={`uppercase tracking-[0.2em] text-sm font-bold font-radiance `}>
                  {mainShowsReserve ? ("RESERVE TIME") : ('REMAINING')}
                </span>
              </div>
            </>
          ) : (
            <div className="text-3xl font-bold text-yellow-500 uppercase tracking-widest">Game Ready</div>
          )}
        </div>

        <div className="flex flex-col items-start w-48">
          <div className="text-xs text-gray-400 tracking-widest uppercase">Reserve</div>
          <div className={`text-xl font-radiance ${activeTeam === 'dire' && reserveTime.dire < 30 ? 'text-red-500 animate-pulse' : 'text-gray-300'}`}>
            {Math.floor(reserveTime.dire / 60)}:{String(reserveTime.dire % 60).padStart(2, '0')}
          </div>
        </div>

        <div className="absolute right-4 top-4 flex items-center gap-3">
          <button onClick={async () => {
            // open live view in external browser with serialized state
            try {
              const payload = { radiantState, direState, draftOrder, draftIndex, config, activePhase, timerDisplay, reserveTime };
              if (window?.electronAPI?.openLiveInBrowser) {
                const res = await window.electronAPI.openLiveInBrowser(payload);
                if (res?.ok) addSystemMessage('Opened live in browser'); else addSystemMessage('Open live failed: ' + (res?.error || 'unknown'));
              } else {
                const url = `${window.location.origin}${window.location.pathname}#live?data=${encodeURIComponent(JSON.stringify(payload))}`;
                window.open(url, '_blank');
                addSystemMessage('Opened live in browser (fallback)');
              }
            } catch (e) {
              addSystemMessage('Failed to open live in browser: ' + e.message);
            }
          }} className="text-gray-400 hover:text-white bg-gray-800/40 px-3 py-1 rounded">Open Live</button>

          <div onClick={onExit} className="text-gray-600 hover:text-white cursor-pointer">
            <ArrowLeft size={20} />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <div className={`absolute inset-0 pointer-events-none opacity-20 transition-colors duration-1000
           ${activeTeam === 'radiant' ? 'bg-gradient-to-r from-green-900/30 to-transparent' : 'bg-gradient-to-l from-red-900/30 to-transparent'}
        `} />

        <TeamDraftColumn
          teamName={config.radiantName}
          isRadiant={true}
          picks={radiantState.picks}
          bans={radiantState.bans}
          activeTeam={activeTeam}
          playerTeam={playerTeam}
          config={config}
          draftOrder={draftOrder}
          draftIndex={draftIndex}
          activePhase={activePhase}
          timerDisplay={timerDisplay}
        />

        {/* Hero Grid */}
        <div className="flex-1 flex flex-col bg-[#16191d] border-x border-gray-800 relative z-10">
          <div className="flex items-center justify-center gap-8 py-2 text-[10px] uppercase tracking-widest text-gray-500">
            <span>Strength</span>
            <span>Agility</span>
            <span>Intelligence</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto scrollbar-hide">
            {['str', 'agi', 'int'].map(attr => (
              <div key={attr} className="mb-6">
                <div className="flex flex-wrap justify-center gap-1">
                  {HEROES.filter(h => h.attr === attr).map(hero => (
                    <HeroCard
                      key={hero.id}
                      hero={hero}
                      isSelected={selectedHero?.id === hero.id}
                      isBanned={isHeroTaken(hero)}
                      isPicked={isHeroTaken(hero)}
                      onClick={handleHeroClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="h-24 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-8 shrink-0">
            <div className="w-1/3">
              <input
                type="text"
                placeholder="Type to Search..."
                className="bg-black/30 border border-gray-700 text-gray-300 px-3 py-1 text-sm w-full focus:outline-none focus:border-gray-500"
              />
            </div>

            <div className="flex flex-col items-center justify-center w-1/3">
              {selectedHero && isPlayerTurn && (
                <>
                  <div className="text-xs text-gray-400 mb-1 uppercase tracking-widest">
                    {activeAction === 'ban' ? 'Ban Hero' : 'Pick Hero'}
                  </div>
                  <button
                    onClick={() => { if (selectedHero) commitTurn(selectedHero); }}
                    className={`
                        px-12 py-2 font-bold uppercase tracking-wider text-white shadow-lg transition-all
                        ${activeAction === 'ban'
                        ? 'bg-red-700 hover:bg-red-600 shadow-red-900/20'
                        : 'bg-green-700 hover:bg-green-600 shadow-green-900/20'}
                      `}
                  >
                    {activeAction === 'ban' ? 'BAN' : 'PICK'} {selectedHero.name}
                  </button>
                </>
              )}
            </div>

            <div className="w-1/3 flex justify-end gap-4 text-gray-500">
              <div className="flex flex-col items-center">
                <Swords size={16} />
                <span className="text-[10px] mt-1">Carries</span>
              </div>
              <div className="flex flex-col items-center">
                <Shield size={16} />
                <span className="text-[10px] mt-1">Supports</span>
              </div>
            </div>
          </div>
        </div>

        <TeamDraftColumn
          teamName={config.direName}
          isRadiant={false}
          picks={direState.picks}
          bans={direState.bans}
          activeTeam={activeTeam}
          playerTeam={playerTeam}
          config={config}
          draftOrder={draftOrder}
          draftIndex={draftIndex}
          activePhase={activePhase}
          timerDisplay={timerDisplay}
        />
      </main>

      {/* Show sticky reserve banner when main timer has run out */}


      {/* Footer */}
      <footer className="h-32 bg-black flex shrink-0 border-t border-gray-800">
        <div className="w-32 h-full bg-gray-900 border-r border-gray-800 flex items-center justify-center relative overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-[url('https://liquipedia.net/commons/images/thumb/9/93/7.33_Minimap.png/600px-7.33_Minimap.png')] bg-cover opacity-50 group-hover:opacity-80 transition-opacity" />
          <MapIcon className="text-gray-500 relative z-10" />
        </div>

        <div className="w-64 h-full border-r border-gray-800 p-4 bg-[#121418] flex flex-col items-center justify-between">
          <div className="w-full">
            <div className="text-lg font-bold tracking-wider font-reaver text-yellow-400">{config.tournamentName || 'Tournament Name'}</div>
            <div className="mt-2 text-sm font-radiance text-gray-300">{config.tournamentStage + " Stage" || ''} {config.tournamentStage === 'Champions' && config.tournamentRound ? ` - ${config.tournamentRound}` : ''}</div>
          </div>

          {/* <div className="w-full flex items-center justify-center h-28">
            {config.tournamentLogo ? (
              <img src={config.tournamentLogo} alt="tournament logo" className="max-h-24 max-w-full object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            ) : (
              <div className="w-full h-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-600">Map / Logo</div>
            )}
          </div> */}
        </div>

        <div className="flex-1 flex flex-col bg-[#0c0e10]">
          <div ref={sysLogRef} className="flex-1 p-2 overflow-y-auto space-y-1">
            {systemLog.map((line, idx) => (
              <div key={idx} className="text-xs text-gray-400"><span className="text-yellow-400 font-bold">System:</span> {line}</div>
            ))}
          </div>
          <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center px-2">
            <MessageSquare size={14} className="text-gray-500 mr-2" />
            <input className="bg-transparent text-xs text-white w-full focus:outline-none" placeholder="Say something..." />
          </div>
        </div>

        <div className="w-64 bg-gray-900 border-l border-gray-800 p-4 flex flex-col items-center justify-center text-center">
          <h3 className="text-yellow-500 font-bold text-sm mb-1">Show Live</h3>
          <p className="text-[10px] text-gray-400">Open an OBS-friendly live draft window.</p>
          <button
            onClick={async () => {
              try {
                const payload = { radiantState, direState, draftOrder, draftIndex, config, activePhase, timerDisplay, reserveTime };
                if (window?.electronAPI?.openLiveInBrowser) {
                  const res = await window.electronAPI.openLiveInBrowser(payload);
                  if (res?.ok) addSystemMessage('Opened live in browser'); else addSystemMessage('Open live failed: '+(res?.error||'unknown'));
                } else {
                  const url = `${window.location.origin}${window.location.pathname}#live?data=${encodeURIComponent(JSON.stringify(payload))}`;
                  window.open(url, '_blank');
                  addSystemMessage('Opened live in browser (fallback)');
                }
              } catch (e) {
                addSystemMessage('Failed to open live in browser: ' + e.message);
              }
            }}
            className="mt-2 px-4 py-1 bg-yellow-700 text-white text-[10px] font-bold uppercase hover:bg-yellow-600"
          >
            Open Live
          </button>
        </div>
      </footer>
    </div>
  );
}

export default DraftingGame;