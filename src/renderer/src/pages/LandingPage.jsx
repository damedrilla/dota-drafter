import { Shield, Swords, MessageSquare, Map as MapIcon, Settings, Users, Cpu, Play, ArrowLeft, Save, Edit3 } from 'lucide-react';
const LandingPage = ({ onStart, onSettings }) => {
  return (
    <div className="h-screen w-screen bg-[#0f1215] flex items-center justify-center relative overflow-hidden select-none">
       {/* Fancy Background */}
       <div className="absolute inset-0 bg-[url('https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/morphling.png')] bg-cover bg-center opacity-10 blur-sm transform scale-110"></div>
       <div className="absolute inset-0 bg-gradient-to-t from-[#0f1215] via-[#0f1215]/80 to-transparent"></div>
       
       <div className="z-10 flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-700">
          <div className="flex flex-col items-center">
              <h1 className="text-6xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 drop-shadow-lg">
                Captains Mode
              </h1>
              <span className="text-gray-400 tracking-widest text-sm mt-2">TOURNAMENT DRAFT SIMULATOR</span>
          </div>

          <div className="flex flex-col gap-4 mt-8 w-64">
              <button 
                onClick={onStart}
                className="group relative px-8 py-4 bg-gradient-to-r from-green-800 to-green-900 border border-green-700 text-white font-bold uppercase tracking-widest hover:scale-105 transition-all hover:shadow-lg hover:shadow-green-500/20 clip-path-slant"
              >
                 <div className="flex items-center justify-center gap-3">
                    <Play size={20} className="fill-current" />
                    <span>Start Draft</span>
                 </div>
              </button>

              <button 
                onClick={onSettings}
                className="group relative px-8 py-3 bg-gray-800/50 border border-gray-600 text-gray-300 font-bold uppercase tracking-widest hover:bg-gray-800 hover:text-white hover:border-gray-400 transition-all"
              >
                 <div className="flex items-center justify-center gap-3">
                    <Settings size={18} />
                    <span>Settings</span>
                 </div>
              </button>
          </div>
       </div>

       <div className="absolute bottom-8 text-xs text-gray-600">
          Dota 2 Draft Simulator v1.0
       </div>
    </div>
  )
};

export default LandingPage;