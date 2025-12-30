import { useCallback, useRef } from 'react';

// Web Audio API for generating trade sounds
export function useTradeSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTradeSound = useCallback((type: 'buy' | 'sell' | 'newTrade') => {
    // Debounce - don't play more than once every 200ms
    const now = Date.now();
    if (now - lastPlayedRef.current < 200) return;
    lastPlayedRef.current = now;

    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Different sounds for different events
      switch (type) {
        case 'buy':
          oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 - higher pitch for buy
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
          
        case 'sell':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4 - lower pitch for sell
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
          
        case 'newTrade':
          oscillator.frequency.setValueAtTime(660, ctx.currentTime); // E5
          oscillator.type = 'triangle';
          gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
      }
    } catch (e) {
      // Audio API not available or failed silently
    }
  }, [getAudioContext]);

  return { playTradeSound };
}
