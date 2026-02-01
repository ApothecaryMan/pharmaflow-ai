import { useCallback, useRef, useEffect } from 'react';

export const usePosSounds = () => {
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize AudioContext lazily (usually requires user interaction first)
    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }, []);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
        initAudio();
        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    }, [initAudio]);

    const playBeep = useCallback(() => {
        playTone(800, 'sine', 0.1, 0.1);
    }, [playTone]);

    const playError = useCallback(() => {
        playTone(150, 'sawtooth', 0.3, 0.15);
    }, [playTone]);

    const playSuccess = useCallback(() => {
        // Double ding
        playTone(1000, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(1500, 'sine', 0.2, 0.1), 100);
    }, [playTone]);

    const playClick = useCallback(() => {
        playTone(2000, 'sine', 0.03, 0.02); // Very subtle click
    }, [playTone]);

    const playHighValue = useCallback(() => {
        // Triple ascending chime
        playTone(600, 'sine', 0.1, 0.08);
        setTimeout(() => playTone(900, 'sine', 0.1, 0.08), 100);
        setTimeout(() => playTone(1200, 'sine', 0.3, 0.1), 200);
    }, [playTone]);

    return {
        playBeep,
        playError,
        playSuccess,
        playClick,
        playHighValue
    };
};
