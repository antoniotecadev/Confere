import { Comparison, ComparisonsStorage } from '@/utils/comparisons-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type FilterType = 'all' | 'correct' | 'errors';

export default function HistoryScreen() {
  const router = useRouter();
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [filteredComparisons, setFilteredComparisons] = useState<Comparison[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedComparison, setSelectedComparison] = useState<Comparison | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadComparisons();
    }, [])
  );

  const loadComparisons = async () => {
    try {
      const allComparisons = await ComparisonsStorage.getAllComparisons();
      // Ordenar por data mais recente
      const sorted = allComparisons.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setComparisons(sorted);
      applyFilters(sorted, searchQuery, selectedFilter);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const applyFilters = (data: Comparison[], search: string, filter: FilterType) => {
    let filtered = [...data];

    // Aplicar filtro de busca
    if (search.trim()) {
      filtered = filtered.filter(comp =>
        comp.supermarket.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Aplicar filtro de status
    switch (filter) {
      case 'correct':
        filtered = filtered.filter(comp => comp.matches || comp.difference < 0);
        break;
      case 'errors':
        filtered = filtered.filter(comp => !comp.matches && comp.difference > 0);
        break;
    }

    setFilteredComparisons(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(comparisons, text, selectedFilter);
  };

  const handleFilterChange = (filter: FilterType) => {
    setSelectedFilter(filter);
    applyFilters(comparisons, searchQuery, filter);
  };

  const handleComparisonPress = (comparison: Comparison) => {
    setSelectedComparison(comparison);
    setDetailsModalVisible(true);
  };

  const handleDeleteComparison = (comparisonId: string, supermarket: string) => {
    Alert.alert(
      'Eliminar comparação',
      `Tens certeza que desejas eliminar esta comparação de "${supermarket}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await ComparisonsStorage.deleteComparison(comparisonId);
              await loadComparisons();
            } catch (error) {
              console.error('Erro ao eliminar comparação:', error);
              Alert.alert('Erro', 'Não foi possível eliminar a comparação.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '0,00 Kz';
    return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
  };

  const renderComparisonItem = ({ item }: { item: Comparison }) => (
    <View style={styles.comparisonItemWrapper}>
      <Pressable
        style={({ pressed }) => [
          styles.comparisonItem,
          pressed && styles.comparisonItemPressed,
        ]}
        onPress={() => handleComparisonPress(item)}>
        <View style={styles.comparisonHeader}>
          <View style={styles.supermarketContainer}>
            <Ionicons name="storefront" size={20} color="#2196F3" />
            <Text style={styles.supermarketName}>{item.supermarket}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            item.matches 
              ? styles.statusBadgeSuccess 
              : item.difference > 0 
                ? styles.statusBadgeError 
                : styles.statusBadgeInfo
          ]}>
            <Ionicons 
              name={
                item.matches 
                  ? "checkmark-circle" 
                  : item.difference > 0 
                    ? "close-circle" 
                    : "information-circle"
              } 
              size={16} 
              color="#FFFFFF" 
            />
            <Text style={styles.statusBadgeText}>
              {item.matches ? 'Correto' : item.difference > 0 ? 'Erro' : 'A menos'}
            </Text>
          </View>
        </View>

        <View style={styles.comparisonDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666666" />
            <Text style={styles.detailText}>{formatDate(item.date)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="receipt-outline" size={16} color="#666666" />
            <Text style={styles.detailText}>Total: {formatCurrency(item.calculatedTotal)}</Text>
          </View>

          {!item.matches && (
            <View style={[styles.differenceContainer, item.difference > 0 ? { backgroundColor: '#FFEBEE' } : { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="alert-circle" size={16} color={item.difference > 0 ? "#F44336" : "#2196F3"} />
              <Text style={[styles.differenceText, item.difference > 0 ? { color: '#F44336' } : { color: '#2196F3' }]}>
                Diferença: {formatCurrency(Math.abs(item.difference))}
                {item.difference > 0 ? ' (cobrado a mais)' : ' (cobrado a menos)'}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
      <Pressable
        style={styles.deleteComparisonButton}
        onPress={() => handleDeleteComparison(item.cartId, item.supermarket)}>
        <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="analytics-outline" size={80} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>Nenhuma comparação encontrada</Text>
      <Text style={styles.emptyDescription}>
        {searchQuery || selectedFilter !== 'all'
          ? 'Tenta ajustar os filtros de busca'
          : 'Cria um carrinho e faz a comparação para ver o histórico aqui'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Histórico</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por supermercado..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999999"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => handleSearch('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999999" />
          </Pressable>
        )}
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <Pressable
          style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('all')}>
          <Text style={[styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextActive]}>
            Todos ({comparisons.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterButton, selectedFilter === 'correct' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('correct')}>
          <Ionicons 
            name="checkmark-circle" 
            size={16} 
            color={selectedFilter === 'correct' ? '#FFFFFF' : '#4CAF50'} 
          />
          <Text style={[styles.filterButtonText, selectedFilter === 'correct' && styles.filterButtonTextActive]}>
            Corretos ({comparisons.filter(c => c.matches || c.difference < 0).length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterButton, selectedFilter === 'errors' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('errors')}>
          <Ionicons 
            name="close-circle" 
            size={16} 
            color={selectedFilter === 'errors' ? '#FFFFFF' : '#F44336'} 
          />
          <Text style={[styles.filterButtonText, selectedFilter === 'errors' && styles.filterButtonTextActive]}>
            Erros ({comparisons.filter(c => !c.matches && c.difference > 0).length})
          </Text>
        </Pressable>
      </View>

      {/* Comparisons List */}
      <FlatList
        data={filteredComparisons}
        renderItem={renderComparisonItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredComparisons.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedComparison && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalhes da Comparação</Text>
                  <Pressable
                    onPress={() => setDetailsModalVisible(false)}
                    style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#666666" />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Supermercado:</Text>
                    <Text style={styles.modalValue}>{selectedComparison.supermarket}</Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Data:</Text>
                    <Text style={styles.modalValue}>{formatDate(selectedComparison.date)}</Text>
                  </View>

                  <View style={styles.modalDivider} />

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Total Calculado:</Text>
                    <Text style={styles.modalValue}>{formatCurrency(selectedComparison.calculatedTotal)}</Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Total Informado:</Text>
                    <Text style={styles.modalValue}>{formatCurrency(selectedComparison.chargedTotal)}</Text>
                  </View>

                  <View style={styles.modalDivider} />

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Status:</Text>
                    <View style={[
                      styles.statusBadge, 
                      selectedComparison.matches 
                        ? styles.statusBadgeSuccess 
                        : selectedComparison.difference > 0 
                          ? styles.statusBadgeError 
                          : styles.statusBadgeInfo
                    ]}>
                      <Ionicons 
                        name={
                          selectedComparison.matches 
                            ? "checkmark-circle" 
                            : selectedComparison.difference > 0 
                              ? "close-circle" 
                              : "information-circle"
                        } 
                        size={16} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.statusBadgeText}>
                        {selectedComparison.matches 
                          ? 'Correto' 
                          : selectedComparison.difference > 0 
                            ? 'Erro Detectado' 
                            : 'Cobraram a menos'}
                      </Text>
                    </View>
                  </View>

                  {!selectedComparison.matches && (
                    <>
                      <View style={styles.modalDivider} />
                      <View style={styles.modalRow}>
                        <Text style={styles.modalLabel}>Diferença:</Text>
                        <Text style={[styles.modalValue, selectedComparison.difference > 0 ? { color: '#F44336' } : { color: '#2196F3' }]}>
                          {formatCurrency(Math.abs(selectedComparison.difference))}
                        </Text>
                      </View>
                      <Text style={[
                        styles.modalNote,
                        selectedComparison.difference > 0 ? { color: '#F44336' } : { color: '#2196F3' }
                      ]}>
                        {selectedComparison.difference > 0 
                          ? '⚠️ Foi cobrado a mais do que o esperado' 
                          : 'ℹ️ Foi cobrado a menos do que o esperado'}
                      </Text>
                    </>
                  )}

                  {/* Fotos do Talão */}
                  {selectedComparison.receiptPhotos && selectedComparison.receiptPhotos.length > 0 && (
                    <>
                      <View style={styles.modalDivider} />
                      <View style={styles.photosSection}>
                        <View style={styles.photosSectionHeader}>
                          <Ionicons name="camera" size={18} color="#666666" />
                          <Text style={styles.photosSectionTitle}>
                            Fotos do Talão ({selectedComparison.receiptPhotos.length})
                          </Text>
                        </View>
                        <View style={styles.photosGrid}>
                          {selectedComparison.receiptPhotos.map((uri, index) => (
                            <Pressable
                              key={index}
                              style={styles.photoThumbnail}
                              onPress={() => {
                                setDetailsModalVisible(false);
                                setTimeout(() => setSelectedPhotoIndex(index), 100);
                              }}>
                              <Image source={{ uri }} style={styles.photoThumbnailImage} />
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </>
                  )}
                </View>

                <Pressable
                  style={styles.modalButton}
                  onPress={() => setDetailsModalVisible(false)}>
                  <Text style={styles.modalButtonText}>Fechar</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Visualização de Foto */}
      <Modal
        visible={selectedPhotoIndex !== null && !detailsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedPhotoIndex(null);
          setDetailsModalVisible(true);
        }}>
        <Pressable 
          style={styles.photoModalOverlay}
          onPress={() => {
            setSelectedPhotoIndex(null);
            setDetailsModalVisible(true);
          }}>
          <Pressable
            style={styles.photoModalClose}
            onPress={() => {
              setSelectedPhotoIndex(null);
              setDetailsModalVisible(true);
            }}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </Pressable>
          {selectedPhotoIndex !== null && selectedComparison?.receiptPhotos && (
            <Image
              source={{ uri: selectedComparison.receiptPhotos[selectedPhotoIndex] }}
              style={styles.photoModalImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333333',
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  comparisonItemWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comparisonItem: {
    flex: 1,
    padding: 16,
  },
  comparisonItemPressed: {
    opacity: 0.7,
  },
  deleteComparisonButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F44336',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  supermarketContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  supermarketName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeError: {
    backgroundColor: '#F44336',
  },
  statusBadgeInfo: {
    backgroundColor: '#2196F3',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  comparisonDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666666',
  },
  differenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  differenceText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 16,
    color: '#666666',
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  modalNote: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalNoteError: {
    color: '#F44336',
  },
  modalNoteInfo: {
    color: '#2196F3',
  },
  modalButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  photosSection: {
    marginTop: 8,
  },
  photosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  photosSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  photoThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
});
