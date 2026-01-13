import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SoundContextType {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const SOUND_STORAGE_KEY = 'gol-sound-enabled';

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    return stored !== null ? stored === 'true' : true; // Default to enabled
  });

  useEffect(() => {
    localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
  }, [soundEnabled]);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
  };

  const toggleSound = () => {
    setSoundEnabledState(prev => !prev);
  };

  return (
    <SoundContext.Provider value={{ soundEnabled, setSoundEnabled, toggleSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundContext() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSoundContext must be used within a SoundProvider');
  }
  return context;
}
