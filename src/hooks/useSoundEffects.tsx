import { useCallback, useRef } from 'react';

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Global mute state (can be accessed outside React)
let globalSoundEnabled = true;

export const setGlobalSoundEnabled = (enabled: boolean) => {
  globalSoundEnabled = enabled;
};

export const getGlobalSoundEnabled = () => globalSoundEnabled;

export type SoundType = 
  | 'click' 
  | 'hover' 
  | 'success' 
  | 'xpGain' 
  | 'levelUp' 
  | 'error' 
  | 'complete' 
  | 'notification'
  | 'menuOpen'
  | 'menuClose'
  | 'select'
  | 'deselect'
  | 'tabSwitch'
  | 'toggle';

export function useSoundEffects() {
  const lastPlayTime = useRef<Record<string, number>>({});

  const playTone = useCallback((
    frequency: number, 
    duration: number, 
    type: OscillatorType = 'sine',
    volume: number = 0.15,
    attack: number = 0.01,
    decay: number = 0.1,
    detune: number = 0
  ) => {
    if (!globalSoundEnabled) return;
    
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      
      // ADSR envelope for more satisfying sound
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + attack);
      gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + attack + decay);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      
      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (e) {
      // Silently fail if audio context issues
    }
  }, []);

  const playSound = useCallback((sound: SoundType) => {
    if (!globalSoundEnabled) return;
    
    // Debounce rapid sounds
    const now = Date.now();
    const lastTime = lastPlayTime.current[sound] || 0;
    if (now - lastTime < 50) return;
    lastPlayTime.current[sound] = now;

    switch (sound) {
      case 'click':
        // Sharp tactical click - COD style
        playTone(800, 0.05, 'square', 0.08);
        setTimeout(() => playTone(600, 0.03, 'square', 0.05), 20);
        break;

      case 'hover':
        // Subtle hover blip
        playTone(1200, 0.03, 'sine', 0.04);
        break;

      case 'success':
        // Victory fanfare - ascending notes
        playTone(523, 0.1, 'sine', 0.12);
        setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 80);
        setTimeout(() => playTone(784, 0.15, 'sine', 0.15), 160);
        break;

      case 'xpGain':
        // Satisfying XP collection sound - COD hit marker style
        playTone(880, 0.08, 'sine', 0.15);
        playTone(1760, 0.08, 'sine', 0.1, 0.01, 0.02, 5);
        setTimeout(() => {
          playTone(1046, 0.12, 'sine', 0.12);
        }, 60);
        break;

      case 'levelUp':
        // Epic level up - layered ascending with harmonics
        const levelUpSequence = [
          { freq: 392, delay: 0 },     // G4
          { freq: 523, delay: 100 },   // C5
          { freq: 659, delay: 200 },   // E5
          { freq: 784, delay: 300 },   // G5
          { freq: 1046, delay: 400 },  // C6
        ];
        levelUpSequence.forEach(({ freq, delay }) => {
          setTimeout(() => {
            playTone(freq, 0.25, 'sine', 0.18);
            playTone(freq * 1.5, 0.2, 'triangle', 0.08); // Harmony
          }, delay);
        });
        // Final chord
        setTimeout(() => {
          playTone(1046, 0.5, 'sine', 0.2);
          playTone(1318, 0.5, 'sine', 0.15);
          playTone(1568, 0.5, 'sine', 0.1);
        }, 500);
        break;

      case 'error':
        // Error buzz
        playTone(200, 0.15, 'sawtooth', 0.1);
        setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.08), 100);
        break;

      case 'complete':
        // Task complete - quick satisfying ding
        playTone(1046, 0.1, 'sine', 0.15);
        playTone(1318, 0.08, 'sine', 0.12, 0.01, 0.02, 3);
        setTimeout(() => playTone(1568, 0.15, 'sine', 0.12), 80);
        break;

      case 'notification':
        // Notification ping
        playTone(880, 0.08, 'sine', 0.1);
        setTimeout(() => playTone(1108, 0.1, 'sine', 0.1), 100);
        break;

      case 'menuOpen':
        // Menu open whoosh
        playTone(300, 0.08, 'sine', 0.06);
        setTimeout(() => playTone(500, 0.06, 'sine', 0.08), 40);
        break;

      case 'menuClose':
        // Menu close
        playTone(500, 0.05, 'sine', 0.06);
        setTimeout(() => playTone(300, 0.08, 'sine', 0.05), 40);
        break;

      case 'select':
        // Selection confirm
        playTone(660, 0.06, 'square', 0.08);
        playTone(880, 0.08, 'sine', 0.1);
        break;

      case 'deselect':
        // Deselection
        playTone(440, 0.05, 'triangle', 0.06);
        break;

      case 'tabSwitch':
        // Tab switch - quick mechanical click
        playTone(900, 0.04, 'square', 0.06);
        setTimeout(() => playTone(1100, 0.03, 'sine', 0.08), 25);
        break;

      case 'toggle':
        // Toggle switch sound
        playTone(700, 0.05, 'sine', 0.08);
        setTimeout(() => playTone(900, 0.04, 'sine', 0.1), 30);
        break;
    }
  }, [playTone]);

  return { playSound };
}

// Global sound player for use outside React components
export const globalSoundPlayer = {
  play: (sound: SoundType) => {
    if (!globalSoundEnabled) return;
    
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const playTone = (freq: number, dur: number, type: OscillatorType = 'sine', vol: number = 0.15) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + dur);
        osc.start(now);
        osc.stop(now + dur);
      };

      switch (sound) {
        case 'xpGain':
          playTone(880, 0.08, 'sine', 0.15);
          setTimeout(() => playTone(1046, 0.12, 'sine', 0.12), 60);
          break;
        case 'levelUp':
          [392, 523, 659, 784, 1046].forEach((freq, i) => {
            setTimeout(() => playTone(freq, 0.25, 'sine', 0.18), i * 100);
          });
          setTimeout(() => {
            playTone(1046, 0.5, 'sine', 0.2);
            playTone(1318, 0.5, 'sine', 0.15);
          }, 500);
          break;
        case 'complete':
          playTone(1046, 0.1, 'sine', 0.15);
          setTimeout(() => playTone(1568, 0.15, 'sine', 0.12), 80);
          break;
      }
    } catch (e) {}
  }
};
