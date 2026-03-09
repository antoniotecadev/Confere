import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';
import { Alert } from 'react-native';

const useUtils = () => {

    const copyToClipboard = useCallback(async (text: string, label: string) => {
        try {
            await Clipboard.setStringAsync(text);
            Alert.alert('Copiado!', `${label} copiado para a área de transferência.`); return { success: true };
        } catch (error) {
            console.error('Erro ao copiar para clipboard:', error);
            Alert.alert('Erro', `Não foi possível copiar ${label}. Tente novamente.`);
        }
    }, []);

    return { copyToClipboard };
};

export default useUtils;