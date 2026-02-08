import { createAudioPlayer } from 'expo-audio';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Vibration } from 'react-native';

export type FeedbackType = 'positive' | 'negative';

interface AudioFeedbackContextType {
    playFeedbackSound: (type: FeedbackType, vibrationDuration?: number) => void;
    playPositiveSound: () => void;
    playNegativeSound: () => void;
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
    // Criar os players uma única vez
    const [players] = useState(() => ({
        positive: createAudioPlayer(require('@/assets/sounds/positive.mp3')),
        negative: createAudioPlayer(require('@/assets/sounds/negative.mp3')),
    }));

    /**
     * Toca um som de feedback e vibra o dispositivo
     */
    const playFeedbackSound = (
        type: FeedbackType,
        vibrationDuration: number = 100
    ): void => {
        const player = type === 'positive' ? players.positive : players.negative;

        // Reiniciar o som para o início
        player.seekTo(0);

        // Tocar o som
        player.play();

        // Vibrar o dispositivo
        Vibration.vibrate(vibrationDuration);
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

    /**
     * Para a reprodução de todos os sons
     */
    const stopAllSounds = (): void => {
        players.positive.pause();
        players.negative.pause();
    };

    // Limpar os players quando o Provider for destruído
    useEffect(() => {
        return () => {
            // release() é o método padrão para players criados com createAudioPlayer
            players.positive.release();
            players.negative.release();
        };
    }, [players]);

    return (
        <AudioFeedbackContext.Provider
            value={{
                playFeedbackSound,
                playPositiveSound,
                playNegativeSound,
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
 * const { playPositiveSound, playNegativeSound } = useAudioFeedback();
 * 
 * // Usar em qualquer lugar:
 * playPositiveSound();
 * playNegativeSound();
 */
export function useAudioFeedback(): AudioFeedbackContextType {
    const context = useContext(AudioFeedbackContext);

    if (!context) {
        throw new Error('useAudioFeedback must be used within AudioFeedbackProvider');
    }

    return context;
}
