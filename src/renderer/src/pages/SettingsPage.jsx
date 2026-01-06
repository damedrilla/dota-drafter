import { Shield, Swords, ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
const SettingsPage = ({ config, onSave, onBack }) => {
  const [localConfig, setLocalConfig] = useState(config);

  const updateConfig = (key, value) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const updatePlayer = (team, index, value) => {
    const listKey = team === 'radiant' ? 'radiantPlayers' : 'direPlayers';
    const newList = [...localConfig[listKey]];
    newList[index] = value;
    updateConfig(listKey, newList);
  };

  return (
    <div className="h-screen w-screen bg-[#0f1215] flex flex-col text-white p-8 overflow-y-auto relative">
       <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>

       <div className="max-w-5xl mx-auto w-full z-10">
          <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-6">
             <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                <ArrowLeft size={24} />
             </button>
             <h1 className="text-3xl font-bold uppercase tracking-wider">Tournament Settings</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
             {/* Radiant Settings */}
             <div className="bg-gray-900/50 p-6 border border-green-900/30 rounded-lg">
                <div className="flex items-center gap-3 mb-6 text-green-400">
                   <Swords size={24} />
                   <h2 className="text-xl font-bold uppercase">Radiant Side</h2>
                </div>
                
                <div className="mb-6">
                   <label className="block text-xs uppercase text-gray-500 mb-2">Team Name</label>
                   <input 
                      value={localConfig.radiantName}
                      onChange={(e) => updateConfig('radiantName', e.target.value)}
                      className="w-full bg-black/40 border border-gray-700 text-white px-4 py-3 rounded focus:border-green-500 focus:outline-none font-bold text-lg"
                   />
                </div>

                <div>
                   <label className="block text-xs uppercase text-gray-500 mb-2">Player Roster</label>
                   <div className="space-y-2">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className="flex items-center gap-3">
                           <span className="text-gray-600 font-mono w-4">{i+1}</span>
                           <input 
                              value={localConfig.radiantPlayers[i]}
                              onChange={(e) => updatePlayer('radiant', i, e.target.value)}
                              placeholder={`Player ${i+1}`}
                              className="flex-1 bg-black/20 border border-gray-800 text-gray-300 px-3 py-2 rounded text-sm focus:border-green-500/50 focus:outline-none"
                           />
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* Dire Settings */}
             <div className="bg-gray-900/50 p-6 border border-red-900/30 rounded-lg">
                <div className="flex items-center gap-3 mb-6 text-red-500">
                   <Shield size={24} />
                   <h2 className="text-xl font-bold uppercase">Dire Side</h2>
                </div>
                
                <div className="mb-6">
                   <label className="block text-xs uppercase text-gray-500 mb-2">Team Name</label>
                   <input 
                      value={localConfig.direName}
                      onChange={(e) => updateConfig('direName', e.target.value)}
                      className="w-full bg-black/40 border border-gray-700 text-white px-4 py-3 rounded focus:border-red-500 focus:outline-none font-bold text-lg"
                   />
                </div>

                <div>
                   <label className="block text-xs uppercase text-gray-500 mb-2">Player Roster</label>
                   <div className="space-y-2">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className="flex items-center gap-3">
                           <span className="text-gray-600 font-mono w-4">{i+1}</span>
                           <input 
                              value={localConfig.direPlayers[i]}
                              onChange={(e) => updatePlayer('dire', i, e.target.value)}
                              placeholder={`Player ${i+1}`}
                              className="flex-1 bg-black/20 border border-gray-800 text-gray-300 px-3 py-2 rounded text-sm focus:border-red-500/50 focus:outline-none"
                           />
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* Tournament Settings */}
             <div className="bg-gray-900/50 p-6 border border-yellow-900/30 rounded-lg">
                <div className="flex items-center gap-3 mb-6 text-yellow-400">
                   <Save size={20} />
                   <h2 className="text-xl font-bold uppercase">Tournament</h2>
                </div>

                <div className="mb-4">
                   <label className="block text-xs uppercase text-gray-500 mb-2">Tournament Name</label>
                   <input
                      value={localConfig.tournamentName || ''}
                      onChange={(e) => updateConfig('tournamentName', e.target.value)}
                      className="w-full bg-black/40 border border-gray-700 text-white px-4 py-2 rounded focus:border-yellow-500 focus:outline-none font-bold"
                   />
                </div>

                <div className="mb-4">
                   <label className="block text-xs uppercase text-gray-500 mb-2">Stage</label>
                   <select
                      value={localConfig.tournamentStage || 'Contenders'}
                      onChange={(e) => updateConfig('tournamentStage', e.target.value)}
                      className="w-full bg-black/40 border border-gray-700 text-white px-3 py-2 rounded focus:border-yellow-500 focus:outline-none"
                   >
                      <option>Contenders</option>
                      <option>Challenger</option>
                      <option>Champions</option>
                   </select>
                </div>

                {localConfig.tournamentStage === 'Champions' && (
                  <div className="mb-4">
                     <label className="block text-xs uppercase text-gray-500 mb-2">Round</label>
                     <select
                        value={localConfig.tournamentRound || ''}
                        onChange={(e) => updateConfig('tournamentRound', e.target.value)}
                        className="w-full bg-black/40 border border-gray-700 text-white px-3 py-2 rounded focus:border-yellow-500 focus:outline-none"
                     >
                        <option value="">Select round</option>
                        <option>Quarterfinals</option>
                        <option>Semifinals</option>
                        <option>Grand Finals</option>
                     </select>
                  </div>
                )}

                <div className="mb-4">
                   <label className="block text-xs uppercase text-gray-500 mb-2">Map / Tournament Logo (URL or /path)</label>
                   <input
                      value={localConfig.tournamentLogo || ''}
                      onChange={(e) => updateConfig('tournamentLogo', e.target.value)}
                      placeholder="/logo.png or https://..."
                      className="w-full bg-black/40 border border-gray-700 text-white px-4 py-2 rounded focus:border-yellow-500 focus:outline-none"
                   />
                   {localConfig.tournamentLogo && (
                     <div className="mt-3 w-full h-24 bg-black/10 flex items-center justify-center border border-gray-800">
                        <img src={localConfig.tournamentLogo} alt="logo" className="max-h-20 max-w-full object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
                     </div>
                   )}
                </div>

                <div className="mb-4">
                   <label className="block text-xs uppercase text-gray-500 mb-2">Draft Export Path (folder or file prefix)</label>
                   <input
                      value={localConfig.exportPath || ''}
                      onChange={(e) => updateConfig('exportPath', e.target.value)}
                      placeholder="C:\\path\\to\\folder or C:/path/to/file_prefix"
                      className="w-full bg-black/40 border border-gray-700 text-white px-4 py-2 rounded focus:border-yellow-500 focus:outline-none"
                   />
                   <div className="text-[10px] text-gray-400 mt-2">If a folder is provided, two files will be written: <code>selected_heroes.json</code> and <code>selected_heroes.lua</code>.</div>
                </div>

                <div className="mb-4">
                   <label className="inline-flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!localConfig.enableCounterPick}
                        onChange={(e) => updateConfig('enableCounterPick', e.target.checked)}
                        className="form-checkbox h-4 w-4 text-yellow-500 bg-black/40 border border-gray-700"
                      />
                      <span className="text-xs uppercase text-gray-300">Enable Counter Picks</span>
                   </label>
                   <div className="text-[10px] text-gray-400 mt-2">When enabled, bot picks will favor heroes that counter enemy picks.</div>
                </div>
             </div>
          </div>

          <div className="mt-8 flex justify-end">
             <button 
                onClick={() => onSave(localConfig)}
                className="flex items-center gap-2 px-8 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold uppercase rounded transition-colors"
             >
                <Save size={18} />
                Save Settings
             </button>
          </div>
       </div>
    </div>
  )
}

export default SettingsPage;