import { BackupService } from '@/services/BackupService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function SettingsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    cartsCount: 0,
    comparisonsCount: 0,
    cartsSize: 0,
    comparisonsSize: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const storageStats = await BackupService.getStorageStats();
    setStats(storageStats);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleCreateBackup = async () => {
    if (stats.cartsCount === 0) {
      Alert.alert('Aviso', 'Não há dados para fazer backup.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await BackupService.createBackup();
      
      if (result.success && result.filePath) {
        Alert.alert(
          'Backup Criado',
          'O backup foi criado com sucesso. Desejas partilhar o arquivo?',
          [
            { text: 'Não', style: 'cancel' },
            {
              text: 'Partilhar',
              onPress: async () => {
                const shared = await BackupService.shareBackup(result.filePath!);
                if (!shared) {
                  Alert.alert('Erro', 'Não foi possível partilhar o backup.');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Erro', result.error || 'Erro ao criar backup');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao criar o backup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = () => {
    Alert.alert(
      'Restaurar Backup',
      'Esta acção irá substituir todos os dados actuais. Desejas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await BackupService.restoreBackup();
              
              if (result.success) {
                Alert.alert(
                  'Sucesso',
                  'Backup restaurado com sucesso! A aplicação irá recarregar.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        loadStats();
                        router.replace('/screens/HomeScreen');
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Erro', result.error || 'Erro ao restaurar backup');
              }
            } catch (error) {
              Alert.alert('Erro', 'Ocorreu um erro ao restaurar o backup.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Eliminar Todos os Dados',
      '⚠️ ATENÇÃO: Esta ação irá eliminar TODOS os carrinhos, comparações e histórico permanentemente. Esta ação não pode ser desfeita!',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Tudo',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Tens Certeza?',
              'Esta é a última confirmação. Todos os dados serão perdidos!',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sim, Eliminar Tudo',
                  style: 'destructive',
                  onPress: async () => {
                    setIsLoading(true);
                    try {
                      const success = await BackupService.clearAllData();
                      if (success) {
                        Alert.alert(
                          'Dados Eliminados',
                          'Todos os dados foram eliminados com sucesso.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                loadStats();
                                router.replace('/screens/HomeScreen');
                              },
                            },
                          ]
                        );
                      } else {
                        Alert.alert('Erro', 'Não foi possível eliminar os dados.');
                      }
                    } catch (error) {
                      Alert.alert('Erro', 'Ocorreu um erro ao eliminar os dados.');
                    } finally {
                      setIsLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Premium Section */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [
              styles.premiumCard,
              pressed && styles.premiumCardPressed,
            ]}
            onPress={() => router.push('/screens/PremiumScreen')}>
            <View style={styles.premiumContent}>
              <Text style={styles.premiumEmoji}>💎</Text>
              <View style={styles.premiumTextContainer}>
                <Text style={styles.premiumTitle}>Confere Premium</Text>
                <Text style={styles.premiumSubtitle}>
                  Sem anúncios, backup e mais
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFD700" />
            </View>
          </Pressable>
        </View>

        {/* Storage Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Armazenamento</Text>
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statInfo}>
                <Ionicons name="cart-outline" size={24} color="#2196F3" />
                <View style={styles.statTextContainer}>
                  <Text style={styles.statLabel}>Carrinhos</Text>
                  <Text style={styles.statValue}>{stats.cartsCount}</Text>
                </View>
              </View>
              <Text style={styles.statSize}>{formatBytes(stats.cartsSize)}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statRow}>
              <View style={styles.statInfo}>
                <Ionicons name="analytics-outline" size={24} color="#4CAF50" />
                <View style={styles.statTextContainer}>
                  <Text style={styles.statLabel}>Comparações</Text>
                  <Text style={styles.statValue}>{stats.comparisonsCount}</Text>
                </View>
              </View>
              <Text style={styles.statSize}>{formatBytes(stats.comparisonsSize)}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Utilizado</Text>
              <Text style={styles.totalValue}>
                {formatBytes(stats.cartsSize + stats.comparisonsSize)}
              </Text>
            </View>
          </View>
        </View>

        {/* Backup & Restore */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup & Restauro</Text>
          
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonPrimary,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleCreateBackup}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonTitle}>Criar Backup</Text>
                  <Text style={styles.actionButtonDescription}>
                    Exportar todos os dados para arquivo
                  </Text>
                </View>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonSecondary,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleRestoreBackup}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#2196F3" />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={24} color="#2196F3" />
                <View style={styles.actionButtonTextContainer}>
                  <Text style={[styles.actionButtonTitle, styles.actionButtonTitleSecondary]}>
                    Restaurar Backup
                  </Text>
                  <Text style={[styles.actionButtonDescription, styles.actionButtonDescriptionSecondary]}>
                    Importar dados de um arquivo de backup
                  </Text>
                </View>
              </>
            )}
          </Pressable>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zona de Perigo</Text>
          
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonDanger,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleClearAllData}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
                <View style={styles.actionButtonTextContainer}>
                  <Text style={styles.actionButtonTitle}>Eliminar Todos os Dados</Text>
                  <Text style={styles.actionButtonDescription}>
                    Remove permanentemente todos os dados
                  </Text>
                </View>
              </>
            )}
          </Pressable>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Versão</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Desenvolvedor</Text>
              <Text style={styles.infoValue}>António Teca</Text>
            </View>
            <View style={styles.infoDivider} />
            <Pressable 
              style={styles.infoRow}
              onPress={() => Linking.openURL('mailto:antonioteca@hotmail.com')}
            >
              <Text style={styles.infoLabel}>Contacto</Text>
              <Text style={[styles.infoValue, styles.emailLink]}>antonioteca@hotmail.com</Text>
            </Pressable>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Desenvolvido em</Text>
              <Text style={styles.infoValue}>Angola 🇦🇴</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    marginLeft: 4,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statTextContainer: {
    marginLeft: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  statSize: {
    fontSize: 14,
    color: '#999999',
  },
  statDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonPrimary: {
    backgroundColor: '#2196F3',
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  actionButtonDanger: {
    backgroundColor: '#F44336',
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  actionButtonTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionButtonTitleSecondary: {
    color: '#2196F3',
  },
  actionButtonDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionButtonDescriptionSecondary: {
    color: '#999999',
  },
  premiumCard: {
    backgroundColor: '#5E35B1',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#5E35B1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumCardPressed: {
    opacity: 0.9,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  emailLink: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
});
