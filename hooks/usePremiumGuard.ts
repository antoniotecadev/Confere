import { PremiumService } from '@/services/PremiumService';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export interface PremiumGuardState {
    hasAccess: boolean;
    loading: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | null;
    showBlockModal: boolean;
    expiresAt: number | null;
}

/**
 * 🛡️ Hook para verificar acesso Premium e mostrar modal de bloqueio
 * 
 * Uso:
 * ```tsx
 * const { hasAccess, loading, showBlockModal, closeModal } = usePremiumGuard();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (!hasAccess) return <PremiumBlockModal visible={showBlockModal} onClose={closeModal} />;
 * 
 * return <FeatureContent />;
 * ```
 */
export function usePremiumGuard() {
    const [state, setState] = useState<PremiumGuardState>({
        hasAccess: false,
        loading: true,
        status: null,
        showBlockModal: false,
        expiresAt: null,
    });

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
        try {
            // 1. Verificar conexão PRIMEIRO (rápido)
            const networkState = await NetInfo.fetch();
            const isOnline = networkState.isConnected && networkState.isInternetReachable;

            // 2. Verificar Premium
            const isPremium = await PremiumService.isPremium();

            if (isPremium) {
                setState({
                    hasAccess: true,
                    loading: false,
                    status: 'approved',
                    showBlockModal: false,
                    expiresAt: null,
                });
            } else {
                // 3. Obter status completo
                // Se offline, não tenta Firebase (usa apenas cache local)
                const fullStatus = await PremiumService.getPremiumStatus({ isOnline });

                setState({
                    hasAccess: false,
                    loading: false,
                    status: fullStatus?.status || null,
                    showBlockModal: true,
                    expiresAt: fullStatus?.expiresAt || null,
                });
            }
        } catch (error) {
            console.error('Erro ao verificar acesso Premium:', error);
            setState({
                hasAccess: false,
                loading: false,
                status: null,
                showBlockModal: true,
                expiresAt: null,
            });
        }
    };

    const closeModal = () => {
        setState(prev => ({ ...prev, showBlockModal: false }));
    };

    const retry = () => {
        setState(prev => ({ ...prev, loading: true }));
        checkAccess();
    };

    return {
        ...state,
        closeModal,
        retry,
    };
}
