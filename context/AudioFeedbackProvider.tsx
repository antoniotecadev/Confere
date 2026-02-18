import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useRef } from 'react';
export type FeedbackType = 'positive' | 'negative' | 'beep';

interface AudioFeedbackContextType {
    playFeedbackSound: (type: FeedbackType, vibrationDuration?: number) => void;
    playPositiveSound: () => void;
    playNegativeSound: () => void;
    playBeepSound: () => void;
    stopAllSounds: () => void;
}

const AudioFeedbackContext = createContext<AudioFeedbackContextType | null>(null);

interface AudioFeedbackProviderProps {
    children: ReactNode;
}

/**
 * Provider que inicializa e gerencia os players de áudio globalmente
 * Coloque no _layout.tsx para disponibilizar em todo o app
 */
export function AudioFeedbackProvider({ children }: AudioFeedbackProviderProps) {
    // Usar useRef para os players persistirem entre renders
    const playersRef = useRef<{
        positive: any;
        negative: any;
        beep: any;
    } | null>(null);

    const isReleasedRef = useRef(false);

    // Inicializar players apenas uma vez
    if (!playersRef.current && !isReleasedRef.current) {
        playersRef.current = {
            positive: createAudioPlayer(require('@/assets/sounds/positive.mp3')),
            negative: createAudioPlayer(require('@/assets/sounds/negative.mp3')),
            beep: createAudioPlayer(require('@/assets/sounds/beep.mp3')),
        };
    }

    /**
     * Toca um som de feedback e vibra o dispositivo
     */
    const playFeedbackSound = (
        type: FeedbackType,
        vibrationDuration: number = 100
    ): void => {
        if (isReleasedRef.current || !playersRef.current) return;

        try {
            const player = type === 'positive'
                ? playersRef.current.positive
                : (type === 'negative' ? playersRef.current.negative : playersRef.current.beep);

            // Reiniciar o som para o início
            player.seekTo(0);

            // Tocar o som
            player.play();

            // Vibrar o dispositivo
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.warn('Erro ao tocar som de feedback:', error);
        }
    };

    /**
     * Atalho para tocar som positivo
     */
    const playPositiveSound = (): void => {
        playFeedbackSound('positive');
    };

    /**
     * Atalho para tocar som negativo
     */
    const playNegativeSound = (): void => {
        playFeedbackSound('negative');
    };

    const playBeepSound = (): void => {
        playFeedbackSound('beep');
    }

    /**
     * Para a reprodução de todos os sons
     */
    const stopAllSounds = (): void => {
        if (isReleasedRef.current || !playersRef.current) return;

        try {
            playersRef.current.positive.pause();
            playersRef.current.negative.pause();
            playersRef.current.beep.pause();
        } catch (error) {
            console.warn('Erro ao parar sons:', error);
        }
    };

    // Limpar os players quando o Provider for destruído
    useEffect(() => {
        return () => {
            if (!isReleasedRef.current && playersRef.current) {
                isReleasedRef.current = true;

                try {
                    playersRef.current.positive.release();
                    playersRef.current.negative.release();
                    playersRef.current.beep.release();
                } catch (error) {
                    console.warn('Erro ao liberar players:', error);
                }

                playersRef.current = null;
            }
        };
    }, []);

    return (
        <AudioFeedbackContext.Provider
            value={{
                playFeedbackSound,
                playPositiveSound,
                playNegativeSound,
                playBeepSound,
                stopAllSounds
            }}
        >
            {children}
        </AudioFeedbackContext.Provider>
    );
}

/**
 * Hook para acessar as funções de feedback de áudio em qualquer componente
 * 
 * @example
 * const { playPositiveSound, playNegativeSound, playBeepSound } = useAudioFeedback();
 * 
 * // Usar em qualquer lugar:
 * playPositiveSound();
 * playNegativeSound();
 * playBeepSound();
 */
export function useAudioFeedback(): AudioFeedbackContextType {
    const context = useContext(AudioFeedbackContext);

    if (!context) {
        throw new Error('useAudioFeedback must be used within AudioFeedbackProvider');
    }

    return context;
}
