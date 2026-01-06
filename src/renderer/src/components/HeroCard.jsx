import { useState } from 'react';

const HeroCard = ({ hero, isSelected, isBanned, isPicked, onClick }) => {
  let statusClass = '';
  if (isBanned) statusClass = 'opacity-20 grayscale pointer-events-none';
  if (isPicked) statusClass = 'opacity-40 grayscale pointer-events-none';
  if (isSelected) statusClass = 'ring-2 ring-white scale-105 z-10 shadow-lg shadow-cyan-500/50';

  const bgClass = 
    hero.attr === 'str' ? 'bg-gradient-to-b from-red-900 to-red-950' :
    hero.attr === 'agi' ? 'bg-gradient-to-b from-green-900 to-green-950' :
    'bg-gradient-to-b from-blue-900 to-blue-950';

  // resolve icon using Vite's import.meta.glob (works in bundled exe)
  const iconModules = import.meta.glob('../assets/hero_icons/*.png', { eager: true });
  const iconKey = `../assets/hero_icons/${hero.id}.png`;
  const iconSrc = iconModules[iconKey]?.default || `/hero_icons/${hero.id}.png`;
  const [imageError, setImageError] = useState(false);
  const hasIcon = !!iconSrc && !imageError;

  return (
    <div 
      onClick={() => !isBanned && !isPicked && onClick(hero)}
      className={`group relative w-14 h-8 md:w-20 md:h-12 lg:w-24 lg:h-14 
        cursor-pointer transition-all duration-200 border border-gray-800
        flex items-center justify-center overflow-hidden
        ${bgClass}
        ${statusClass}
        transform hover:scale-105 hover:brightness-110 ${isSelected ? 'z-20' : ''}`}
    >
      {/* hero icon (covers background) */}
      {hasIcon ? (
        <img
          src={iconSrc}
          alt={hero.name}
          onError={() => setImageError(true)}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        // No icon: show name centered
        <div className="relative z-10 px-1 text-sm font-bold text-gray-100 uppercase text-center">
          {hero.name}
        </div>
      )}

      {/* dark gradient so text stays readable */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,0,0,0.65))' }} />

      {/* name revealed on hover (pop-out) */}
      {hasIcon && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-20 w-full px-1 text-center pointer-events-none">
          <div className="inline-block bg-black/60 text-gray-100 text-[10px] md:text-xs font-bold uppercase tracking-tighter px-2 py-0.5 rounded transition-all duration-200 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
            {hero.name}
          </div>
        </div>
      )}

      {isBanned && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-0.5 bg-red-600 rotate-45 absolute" />
          <div className="w-full h-0.5 bg-red-600 -rotate-45 absolute" />
        </div>
      )}

      {isSelected && <div className="absolute top-0 right-0 w-2 h-2 bg-white animate-pulse" />}
    </div>
  );
};

export default HeroCard;