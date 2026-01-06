import { useEffect, useState } from 'react';

export default function TitleBar({ title = 'Dota Drafter' }) {
  const [isMax, setIsMax] = useState(false);

  const callHost = async (channel, ...args) => {
    try {
      if (window.electronWindow && typeof window.electronWindow[channel] === 'function') {
        return await window.electronWindow[channel](...args);
      }
      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        return await ipcRenderer.invoke(`window-${channel.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`)}`);
      }
    } catch (e) {}
  };

  useEffect(() => {
    (async () => {
      try {
        if (window.electronWindow?.isMaximized) {
          const v = await window.electronWindow.isMaximized();
          setIsMax(Boolean(v));
        } else if (window.require) {
          const { ipcRenderer } = window.require('electron');
          const v = await ipcRenderer.invoke('window-is-maximized');
          setIsMax(Boolean(v));
          const handler = (_, val) => setIsMax(Boolean(val));
          ipcRenderer.on('window-maximize-changed', handler);
          return () => ipcRenderer.removeListener('window-maximize-changed', handler);
        }
      } catch (e) {}
    })();
  }, []);

  const doMinimize = () => callHost('minimize');
  const doToggleMax = async () => {
    const res = await callHost('toggleMaximize');
    if (typeof res !== 'undefined') setIsMax(Boolean(res));
  };
  const doClose = () => callHost('close');

  const onDoubleClick = () => doToggleMax();

  return (
    <div
      onDoubleClick={onDoubleClick}
      style={{
        WebkitAppRegion: 'drag',

        top: 0,
        left: 0,
        right: 0,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 12,
        background: 'linear-gradient(90deg, rgba(8,10,12,0.9), rgba(18,18,18,0.95))',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        zIndex: 60,
        userSelect: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ WebkitAppRegion: 'no-drag', width: 18, height: 18, borderRadius: 4, background: '#0b0b0b' }} />
        <div style={{ fontFamily: 'Reaver, sans-serif', fontWeight: 700, fontSize: 13 }}>{title}</div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: 6, WebkitAppRegion: 'no-drag' }}>
        <button onClick={doMinimize} title="Minimize" style={btnStyle}>▁</button>
        <button onClick={doToggleMax} title="Maximize" style={btnStyle}>{isMax ? '🗗' : '🗖'}</button>
        <button onClick={doClose} title="Close" style={{ ...btnStyle, background: 'transparent', color: '#ffdede' }}>✕</button>
      </div>
    </div>
  );
}

const btnStyle = {
  width: 44,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  background: 'transparent',
  border: 'none',
  color: '#ddd',
  cursor: 'pointer',
  fontSize: 13,
  WebkitAppRegion: 'no-drag'
};