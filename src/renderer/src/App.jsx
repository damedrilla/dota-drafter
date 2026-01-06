import { useState, useEffect } from 'react';
import './fonts.css'
// --- HERO DATA --
import LandingPage from './pages/LandingPage';
import SettingsPage from './pages/SettingsPage';
import DraftingGame from './pages/DraftingGame';
import HeroSelection from './pages/HeroSelection';
import LiveDraft from './pages/LiveDraft';
import TitleBar from './components/TitleBar';
 
export default function App() {
  const [view, setView] = useState('landing'); // landing | settings | draft | hero-select
  const [draftResult, setDraftResult] = useState(null);
 
  const [config, setConfig] = useState({
    radiantName: 'Radiant',
    direName: 'Dire',
    radiantPlayers: ['', '', '', '', ''],
    direPlayers: ['', '', '', '', '']
  });
  
  // add defaults for tournament settings so SettingsPage can rely on keys
  if (!config.tournamentName) config.tournamentName = 'Tournament Name';
  if (!config.tournamentStage) config.tournamentStage = 'Contenders';
  if (!config.tournamentRound) config.tournamentRound = '';
  if (!config.tournamentLogo) config.tournamentLogo = '';

  // Load Config on Mount (from JSON)
  useEffect(() => {
    // If running in Electron (window.require available) prefer the writable config file
    // in the working directory so user changes persist. Otherwise fall back to the
    // dev/public `draft_settings.json` served by Vite, and finally localStorage.
    const defaults = {
      tournamentName: 'Tournament Name',
      tournamentStage: 'Contenders',
      tournamentRound: '',
      tournamentLogo: ''
    };

    (async () => {
      // Prefer main-process persisted settings when available
      try {
        if (window.electronAPI?.loadSettings) {
          const r = await window.electronAPI.loadSettings();
          if (r && r.ok && r.data) {
            setConfig(prev => ({ ...prev, ...defaults, ...r.data }));
            return;
          }
        }
      } catch (e) {
        console.error('electronAPI.loadSettings failed', e);
      }

      // Not available or not found — try fetching the public asset
      try {
        const res = await fetch('/draft_settings.json');
        if (res.ok) {
          const data = await res.json();
          setConfig(prev => ({ ...prev, ...defaults, ...data }));
          return;
        }
      } catch (e) {
        // ignore and fallback
      }

      // Try localStorage (useful for browser testing)
      try {
        const saved = localStorage.getItem('draft_settings');
        if (saved) {
          setConfig(prev => ({ ...prev, ...defaults, ...JSON.parse(saved) }));
          return;
        }
      } catch (e) {
        console.error('Invalid JSON in localStorage draft_settings', e);
      }

      // As a last resort, ensure defaults are present
      setConfig(prev => ({ ...prev, ...defaults }));
    })();
  }, []);

  const handleSaveSettings = (newConfig) => {
    setConfig(newConfig);

    // Save to a writable location. Do NOT try to write into the public folder — it's read-only in packaged apps.
    (async () => {
      try {
        if (window.electronAPI?.saveSettings) {
          await window.electronAPI.saveSettings(newConfig);
          return;
        }
      } catch (e) {
        console.error('electronAPI.saveSettings failed', e);
      }

      // fallback: try writing directly in dev (source tree) when window.require is available
      if (window.require) {
        try {
          const fs = window.require('fs');
          const path = window.require('path');
          const p = path.join(process.cwd(), 'src', 'renderer', 'src', 'assets', 'draft_settings.json');
          fs.writeFileSync(p, JSON.stringify(newConfig, null, 2));
          return;
        } catch (e) {
          console.error('Failed to save settings to source file', e);
        }
      }

      // final fallback: localStorage
      try {
        localStorage.setItem('draft_settings', JSON.stringify(newConfig));
      } catch (e) {
        console.error('Failed to save settings to localStorage', e);
      }
    })();

    setView('landing');
  };

  return (
    <>
      {/* If launched with #live in the URL, render the OBS-friendly live draft view only */}
      {typeof window !== 'undefined' && window.location.hash.includes('live') ? (
        <LiveDraft />
      ) : (
        <>
          <TitleBar title="ICCup Dota Drafter" />

          {/* app container sized to viewport minus titlebar (prevents pages with h-screen from overflowing) */}
          <div style={{ minHeight: 'calc(100vh - 40px)', maxHeight: 'calc(100vh - 40px)', overflow: 'auto'}} className="app-root">
       {view === 'landing' && (
         <LandingPage 
           onStart={() => setView('draft')} 
           onSettings={() => setView('settings')} 
         />
       )}
       
       {view === 'settings' && (
         <SettingsPage 
           config={config} 
           onSave={handleSaveSettings} 
           onBack={() => setView('landing')} 
         />
       )}

       {view === 'draft' && (
         <DraftingGame 
           config={config} 
           onExit={() => setView('landing')}
           onComplete={(result) => {
             setDraftResult(result);
             setView('hero-select');
           }}
         />
       )}

       {view === 'hero-select' && draftResult && (
         <HeroSelection
           config={config}
           radiantPicks={draftResult.radiantPicks}
           direPicks={draftResult.direPicks}
           playerTeam={draftResult.playerTeam}
           onBack={() => setView('landing')}
           onDone={() => setView('landing')}
         />
       )}
          </div>
        </>
      )}
    </>
   );
 }