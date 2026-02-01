import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { cacheDirectory, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface BackupData {
  version: string;
  timestamp: string;
  carts: string;
  comparisons: string;
  hasSeenOnboarding: string | null;
}

const BACKUP_VERSION = '1.0';

export const BackupService = {
  /**
   * Cria um backup completo de todos os dados
   */
  async createBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Buscar todos os dados do AsyncStorage
      const carts = await AsyncStorage.getItem('@confere:carts');
      const comparisons = await AsyncStorage.getItem('@confere:comparisons');
      const hasSeenOnboarding = await AsyncStorage.getItem('@confere:hasSeenOnboarding');

      const backupData: BackupData = {
        version: BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        carts: carts || '[]',
        comparisons: comparisons || '[]',
        hasSeenOnboarding: hasSeenOnboarding,
      };

      // Criar nome do arquivo
      const date = new Date();
      const fileName = `confere_backup_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}.json`;
      
      const filePath = `${cacheDirectory}${fileName}`;
      const content = JSON.stringify(backupData, null, 2);

      // Usar a API nativa do JavaScript para escrever o arquivo
      if (Platform.OS === 'web') {
        // Para web, usar Blob e download
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, filePath: fileName };
      } else {
        // Para mobile, escrever no cache
        await writeAsStringAsync(filePath, content);
        return { success: true, filePath };
      }
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      return { success: false, error: 'Erro ao criar backup' };
    }
  },

  /**
   * Compartilha o arquivo de backup
   */
  async shareBackup(filePath: string): Promise<boolean> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return false;
      }

      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Guardar Backup do Confere',
        UTI: 'public.json',
      });

      return true;
    } catch (error) {
      console.error('Erro ao compartilhar backup:', error);
      return false;
    }
  },

  /**
   * Restaura dados de um backup
   */
  async restoreBackup(): Promise<{ success: boolean; error?: string }> {
    try {
      // Selecionar arquivo
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { success: false, error: 'Operação cancelada' };
      }

      // Ler arquivo usando a API legacy
      const fileContent = await readAsStringAsync(result.assets[0].uri);

      const backupData: BackupData = JSON.parse(fileContent);

      // Validar versão
      if (!backupData.version || backupData.version !== BACKUP_VERSION) {
        return { success: false, error: 'Versão do backup incompatível' };
      }

      // Restaurar dados
      if (backupData.carts) {
        await AsyncStorage.setItem('@confere:carts', backupData.carts);
      }
      if (backupData.comparisons) {
        await AsyncStorage.setItem('@confere:comparisons', backupData.comparisons);
      }
      if (backupData.hasSeenOnboarding !== null) {
        await AsyncStorage.setItem('@confere:hasSeenOnboarding', backupData.hasSeenOnboarding);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      return { success: false, error: 'Erro ao ler arquivo de backup' };
    }
  },

  /**
   * Limpa todos os dados do app
   */
  async clearAllData(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([
        '@confere:carts',
        '@confere:comparisons',
        '@confere:hasSeenOnboarding',
      ]);
      return true;
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      return false;
    }
  },

  /**
   * Obtém estatísticas de armazenamento
   */
  async getStorageStats(): Promise<{
    cartsCount: number;
    comparisonsCount: number;
    cartsSize: number;
    comparisonsSize: number;
  }> {
    try {
      const carts = await AsyncStorage.getItem('@confere:carts');
      const comparisons = await AsyncStorage.getItem('@confere:comparisons');

      const cartsData = carts ? JSON.parse(carts) : [];
      const comparisonsData = comparisons ? JSON.parse(comparisons) : [];

      // Calcular tamanho em bytes apenas se houver dados reais
      const cartsSize = cartsData.length > 0 ? new Blob([carts || '']).size : 0;
      const comparisonsSize = comparisonsData.length > 0 ? new Blob([comparisons || '']).size : 0;

      return {
        cartsCount: cartsData.length,
        comparisonsCount: comparisonsData.length,
        cartsSize,
        comparisonsSize,
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        cartsCount: 0,
        comparisonsCount: 0,
        cartsSize: 0,
        comparisonsSize: 0,
      };
    }
  },
};
