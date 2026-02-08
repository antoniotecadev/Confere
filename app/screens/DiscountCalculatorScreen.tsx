import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

type PromotionType = 'percentage' | 'buyXPayY' | 'buyXGetDiscount' | 'fixedPrice';

export default function DiscountCalculatorScreen() {
  const router = useRouter();

  const [promotionType, setPromotionType] = useState<PromotionType>('percentage');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [buyQuantity, setBuyQuantity] = useState('');
  const [payQuantity, setPayQuantity] = useState('');
  const [finalPrice, setFinalPrice] = useState('');

  // Resultados
  const [result, setResult] = useState<{
    originalTotal: number;
    finalTotal: number;
    savings: number;
    realDiscount: number;
    isGoodDeal: 'excellent' | 'good' | 'fair' | 'poor';
  } | null>(null);

  useEffect(() => {
    calculateDiscount();
  }, [
    promotionType,
    originalPrice,
    discountValue,
    buyQuantity,
    payQuantity,
    finalPrice,
  ]);

  const calculateDiscount = () => {
    const price = parseFloat(originalPrice);
    if (isNaN(price) || price <= 0) {
      setResult(null);
      return;
    }

    let originalTotal = 0;
    let finalTotal = 0;
    let quantity = 1;

    switch (promotionType) {
      case 'percentage':
        const discount = parseFloat(discountValue);
        if (isNaN(discount) || discount < 0 || discount > 100) {
          setResult(null);
          return;
        }
        originalTotal = price;
        finalTotal = price * (1 - discount / 100);
        break;

      case 'buyXPayY':
        const buy = parseInt(buyQuantity);
        const pay = parseInt(payQuantity);
        if (isNaN(buy) || isNaN(pay) || buy <= 0 || pay <= 0 || pay >= buy) {
          setResult(null);
          return;
        }
        quantity = buy;
        originalTotal = price * buy;
        finalTotal = price * pay;
        break;

      case 'buyXGetDiscount':
        const buyQty = parseInt(buyQuantity);
        const discountPercent = parseFloat(discountValue);
        if (
          isNaN(buyQty) ||
          isNaN(discountPercent) ||
          buyQty <= 0 ||
          discountPercent < 0 ||
          discountPercent > 100
        ) {
          setResult(null);
          return;
        }
        quantity = buyQty;
        originalTotal = price * buyQty;
        finalTotal = originalTotal * (1 - discountPercent / 100);
        break;

      case 'fixedPrice':
        const newPrice = parseFloat(finalPrice);
        if (isNaN(newPrice) || newPrice <= 0 || newPrice >= price) {
          setResult(null);
          return;
        }
        originalTotal = price;
        finalTotal = newPrice;
        break;
    }

    const savings = originalTotal - finalTotal;
    const realDiscount = (savings / originalTotal) * 100;

    let isGoodDeal: 'excellent' | 'good' | 'fair' | 'poor';
    if (realDiscount >= 40) {
      isGoodDeal = 'excellent';
    } else if (realDiscount >= 25) {
      isGoodDeal = 'good';
    } else if (realDiscount >= 10) {
      isGoodDeal = 'fair';
    } else {
      isGoodDeal = 'poor';
    }

    setResult({
      originalTotal,
      finalTotal,
      savings,
      realDiscount,
      isGoodDeal,
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Kz`;
  };

  const getDealColor = () => {
    if (!result) return '#666666';
    switch (result.isGoodDeal) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#8BC34A';
      case 'fair':
        return '#FF9800';
      case 'poor':
        return '#f44336';
    }
  };

  const getDealText = () => {
    if (!result) return '';
    switch (result.isGoodDeal) {
      case 'excellent':
        return 'Excelente promoção!';
      case 'good':
        return 'Boa promoção';
      case 'fair':
        return 'Promoção razoável';
      case 'poor':
        return 'Desconto pequeno';
    }
  };

  const getDealIcon = () => {
    if (!result) return 'help-circle';
    switch (result.isGoodDeal) {
      case 'excellent':
        return 'checkmark-circle';
      case 'good':
        return 'checkmark-circle-outline';
      case 'fair':
        return 'alert-circle-outline';
      case 'poor':
        return 'close-circle-outline';
    }
  };

  const clearAll = () => {
    setOriginalPrice('');
    setDiscountValue('');
    setBuyQuantity('');
    setPayQuantity('');
    setFinalPrice('');
    setResult(null);
  };

  const renderPromotionTypeSelector = () => (
    <View style={styles.typeSelectorContainer}>
      <Text style={styles.sectionLabel}>Tipo de Promoção</Text>
      <View style={styles.typeButtonsRow}>
        <Pressable
          style={[
            styles.typeButton,
            promotionType === 'percentage' && styles.typeButtonActive,
          ]}
          onPress={() => setPromotionType('percentage')}>
          <Ionicons
            name="pricetag"
            size={20}
            color={promotionType === 'percentage' ? '#FFFFFF' : '#2196F3'}
          />
          <Text
            style={[
              styles.typeButtonText,
              promotionType === 'percentage' && styles.typeButtonTextActive,
            ]}>
            % Desconto
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.typeButton,
            promotionType === 'buyXPayY' && styles.typeButtonActive,
          ]}
          onPress={() => setPromotionType('buyXPayY')}>
          <Ionicons
            name="gift"
            size={20}
            color={promotionType === 'buyXPayY' ? '#FFFFFF' : '#2196F3'}
          />
          <Text
            style={[
              styles.typeButtonText,
              promotionType === 'buyXPayY' && styles.typeButtonTextActive,
            ]}>
            Leve X Pague Y
          </Text>
        </Pressable>
      </View>

      <View style={styles.typeButtonsRow}>
        <Pressable
          style={[
            styles.typeButton,
            promotionType === 'buyXGetDiscount' && styles.typeButtonActive,
          ]}
          onPress={() => setPromotionType('buyXGetDiscount')}>
          <Ionicons
            name="cart"
            size={20}
            color={promotionType === 'buyXGetDiscount' ? '#FFFFFF' : '#2196F3'}
          />
          <Text
            style={[
              styles.typeButtonText,
              promotionType === 'buyXGetDiscount' && styles.typeButtonTextActive,
            ]}>
            Compre X Ganhe %
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.typeButton,
            promotionType === 'fixedPrice' && styles.typeButtonActive,
          ]}
          onPress={() => setPromotionType('fixedPrice')}>
          <Ionicons
            name="trending-down"
            size={20}
            color={promotionType === 'fixedPrice' ? '#FFFFFF' : '#2196F3'}
          />
          <Text
            style={[
              styles.typeButtonText,
              promotionType === 'fixedPrice' && styles.typeButtonTextActive,
            ]}>
            Preço Fixo
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderInputs = () => {
    switch (promotionType) {
      case 'percentage':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preço Original (Kz)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 1500"
                value={originalPrice}
                onChangeText={setOriginalPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Desconto (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 30"
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );

      case 'buyXPayY':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preço Unitário (Kz)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 500"
                value={originalPrice}
                onChangeText={setOriginalPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Leve</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3"
                  value={buyQuantity}
                  onChangeText={setBuyQuantity}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Pague</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  value={payQuantity}
                  onChangeText={setPayQuantity}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </>
        );

      case 'buyXGetDiscount':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preço Unitário (Kz)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 800"
                value={originalPrice}
                onChangeText={setOriginalPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Compre</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2"
                  value={buyQuantity}
                  onChangeText={setBuyQuantity}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Ganhe % Desconto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="15"
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </>
        );

      case 'fixedPrice':
        return (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preço Original (Kz)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 2000"
                value={originalPrice}
                onChangeText={setOriginalPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Novo Preço (Kz)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 1500"
                value={finalPrice}
                onChangeText={setFinalPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </>
        );
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <View style={styles.resultContainer}>
        <View style={[styles.resultHeader, { backgroundColor: getDealColor() }]}>
          <Ionicons name={getDealIcon()} size={32} color="#FFFFFF" />
          <Text style={styles.resultTitle}>{getDealText()}</Text>
        </View>

        <View style={styles.resultBody}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Preço Original:</Text>
            <Text style={styles.resultValue}>{formatCurrency(result.originalTotal)}</Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Preço Final:</Text>
            <Text style={[styles.resultValue, styles.resultValueFinal]}>
              {formatCurrency(result.finalTotal)}
            </Text>
          </View>

          <View style={styles.resultDivider} />

          <View style={styles.resultRow}>
            <Text style={styles.resultLabelBold}>Economia:</Text>
            <Text style={[styles.resultValueBold, { color: getDealColor() }]}>
              {formatCurrency(result.savings)}
            </Text>
          </View>

          <View style={styles.resultRow}>
            <Text style={styles.resultLabelBold}>Desconto Real:</Text>
            <Text style={[styles.resultValueBold, { color: getDealColor() }]}>
              {result.realDiscount.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.resultFooter}>
          <Ionicons name="bulb" size={20} color="#FF9800" />
          <Text style={styles.resultTip}>
            {result.realDiscount >= 25
              ? 'Vale muito a pena! Aproveite!'
              : result.realDiscount >= 10
              ? 'Desconto moderado. Compare com outros.'
              : 'Desconto pequeno. Procure outras opções.'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Calculadora de Desconto</Text>
        <Pressable onPress={clearAll} style={styles.clearButton}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {renderPromotionTypeSelector()}

        <View style={styles.inputsContainer}>{renderInputs()}</View>

        {renderResult()}
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
    backgroundColor: '#9C27B0',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  clearButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  typeSelectorContainer: {
    marginBottom: 24,
  },
  typeButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 6,
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  inputsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  resultHeader: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resultBody: {
    padding: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 16,
    color: '#666666',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  resultValueFinal: {
    color: '#2196F3',
  },
  resultDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  resultLabelBold: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  resultValueBold: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  resultFooter: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultTip: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
  },
});
