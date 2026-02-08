import { ShoppingListItem, ShoppingListService } from '@/app/services/ShoppingListService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function ShoppingListScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [itemsWithPrice, setItemsWithPrice] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; count: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadData();
    loadSuggestions();
  }, []);

  const loadData = async () => {
    const data = await ShoppingListService.getItems();
    setItems(data);
    updateTotal();
  };

  const loadSuggestions = async () => {
    const suggested = await ShoppingListService.getSuggestedProducts(10);
    setSuggestions(suggested);
  };

  const updateTotal = async () => {
    const totals = await ShoppingListService.getEstimatedTotal();
    setEstimatedTotal(totals.total);
    setItemsWithPrice(totals.itemsWithPrice);
    setTotalItems(totals.totalItems);
  };

  const handleAddItem = async () => {
    if (!inputValue.trim()) {
      Alert.alert('Aviso', 'Digite o nome do produto');
      return;
    }

    const qty = parseInt(quantity) || 1;
    await ShoppingListService.addItem(inputValue.trim(), qty, 'un');
    
    setInputValue('');
    setQuantity('1');
    setShowSuggestions(false);
    loadData();
  };

  const handleToggleItem = async (itemId: string) => {
    await ShoppingListService.toggleItem(itemId);
    loadData();
  };

  const handleRemoveItem = (itemId: string) => {
    Alert.alert(
      'Remover Item',
      'Desejas remover este item da lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await ShoppingListService.removeItem(itemId);
            loadData();
          },
        },
      ]
    );
  };

  const handleClearChecked = () => {
    const checkedCount = items.filter((item) => item.checked).length;
    
    if (checkedCount === 0) {
      Alert.alert('Aviso', 'Não há itens marcados para limpar.');
      return;
    }

    Alert.alert(
      'Limpar Itens Comprados',
      `Remover ${checkedCount} ${checkedCount === 1 ? 'item marcado' : 'itens marcados'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await ShoppingListService.clearCheckedItems();
            loadData();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (items.length === 0) {
      Alert.alert('Aviso', 'A lista já está vazia.');
      return;
    }

    Alert.alert(
      'Limpar Tudo',
      'Desejas remover todos os itens da lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar Tudo',
          style: 'destructive',
          onPress: async () => {
            await ShoppingListService.clearAll();
            loadData();
          },
        },
      ]
    );
  };

  const handleSelectSuggestion = (name: string) => {
    setInputValue(name);
    setShowSuggestions(false);
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('pt-AO')} Kz`;
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => (
    <View style={[styles.itemCard, item.checked && styles.itemCardChecked]}>
      <Pressable
        style={styles.checkboxContainer}
        onPress={() => handleToggleItem(item.id)}>
        <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
          {item.checked && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
        </View>
      </Pressable>

      <View style={styles.itemContent}>
        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
          {item.name}
          {item.quantity > 1 && (
            <Text style={styles.itemQuantity}> ({item.quantity}x)</Text>
          )}
        </Text>

        {item.suggestedPrice !== null && (
          <View style={styles.priceContainer}>
            <Ionicons name="pricetag-outline" size={14} color="#666666" />
            <Text style={styles.suggestedPrice}>
              ~{formatPrice(item.suggestedPrice * item.quantity)}
            </Text>
            {item.lastStore && (
              <Text style={styles.lastStore}>
                {' • '}{item.lastStore}
                {item.daysAgo !== null && (
                  <Text style={styles.daysAgo}>
                    {' ('}
                    {item.daysAgo === 0 ? 'hoje' : 
                     item.daysAgo === 1 ? 'ontem' : 
                     `há ${item.daysAgo} dias`}
                    {')'}
                  </Text>
                )}
              </Text>
            )}
            {item.isOldData && (
              <Text style={styles.oldDataWarning}> ⚠️ Antigo</Text>
            )}
          </View>
        )}

        {item.suggestedPrice === null && (
          <Text style={styles.noPrice}>Sem histórico de preço</Text>
        )}
      </View>

      <Pressable
        style={styles.removeButton}
        onPress={() => handleRemoveItem(item.id)}>
        <Ionicons name="trash-outline" size={20} color="#F44336" />
      </Pressable>
    </View>
  );

  const uncheckedItems = items.filter((item) => !item.checked);
  const checkedItems = items.filter((item) => item.checked);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Lista de Compras</Text>
        <Pressable onPress={handleClearAll} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Total Estimado */}
      {totalItems > 0 && (
        <View style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <Ionicons name="calculator-outline" size={24} color="#4CAF50" />
            <Text style={styles.totalLabel}>Total Estimado:</Text>
          </View>
          <Text style={styles.totalValue}>{formatPrice(estimatedTotal)}</Text>
          <Text style={styles.totalSubtitle}>
            {itemsWithPrice} de {totalItems} {totalItems === 1 ? 'item' : 'itens'} com preço
          </Text>
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#2196F3" />
            <Text style={styles.infoText}>
              Total = Σ (Preço Médio × Quantidade){'\n'}
              Baseado nos últimos 30 dias
            </Text>
          </View>
        </View>
      )}

      {/* Input para adicionar */}
      <View style={styles.inputSection}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Adicionar produto..."
            placeholderTextColor="#999999"
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text);
              setShowSuggestions(text.length > 0);
            }}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
          />
          
          <TextInput
            style={styles.quantityInput}
            placeholder="Qtd"
            placeholderTextColor="#999999"
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
          />

          <Pressable style={styles.addButton} onPress={handleAddItem}>
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Sugestões de produtos frequentes */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Produtos Frequentes:</Text>
            <View style={styles.suggestionsList}>
              {suggestions.slice(0, 5).map((suggestion, index) => (
                <Pressable
                  key={index}
                  style={styles.suggestionChip}
                  onPress={() => handleSelectSuggestion(suggestion.name)}>
                  <Text style={styles.suggestionText}>{suggestion.name}</Text>
                  <Text style={styles.suggestionCount}>({suggestion.count}x)</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Lista de itens */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>Sua lista está vazia</Text>
          <Text style={styles.emptySubtext}>
            Adicione produtos acima para começar
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...uncheckedItems, ...checkedItems]}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={
            checkedItems.length > 0 ? (
              <View style={styles.footerContainer}>
                <Pressable style={styles.clearCheckedButton} onPress={handleClearChecked}>
                  <Ionicons name="checkmark-done-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.clearCheckedText}>
                    Limpar {checkedItems.length} {checkedItems.length === 1 ? 'item comprado' : 'itens comprados'}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CAF50',
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
  clearButton: {
    padding: 8,
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 8,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  totalSubtitle: {
    fontSize: 13,
    color: '#999999',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333333',
    marginRight: 8,
  },
  quantityInput: {
    width: 60,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    marginTop: 12,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '600',
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  suggestionText: {
    fontSize: 14,
    color: '#2E7D32',
    marginRight: 4,
  },
  suggestionCount: {
    fontSize: 12,
    color: '#66BB6A',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemCardChecked: {
    opacity: 0.6,
    backgroundColor: '#F9F9F9',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#999999',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666666',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestedPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  lastStore: {
    fontSize: 12,
    color: '#999999',
  },
  daysAgo: {
    fontSize: 11,
    color: '#999999',
    fontStyle: 'italic',
  },
  oldDataWarning: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
  },
  noPrice: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
  },
  footerContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  clearCheckedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  clearCheckedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
