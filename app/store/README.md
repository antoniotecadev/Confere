# CartContext - Guia de Uso

## Importação

```typescript
import { useCart } from '@/app/store/CartContext';
```

## Usando o Hook em Componentes

```typescript
export default function MyComponent() {
  const {
    carts,
    products,
    currentCart,
    isLoading,
    addCart,
    updateCart,
    addItemToCart,
    // ... outras funções
  } = useCart();

  // Seu código aqui
}
```

## Exemplos de Uso

### 1. Listar Carrinhos (HomeScreen)

```typescript
const { carts, isLoading, refreshCarts } = useCart();

useEffect(() => {
  refreshCarts();
}, []);

return (
  <FlatList
    data={carts}
    renderItem={({ item }) => <CartItem cart={item} />}
    onRefresh={refreshCarts}
    refreshing={isLoading}
  />
);
```

### 2. Criar Novo Carrinho

```typescript
const { addCart } = useCart();

const handleCreateCart = async () => {
  try {
    const newCart = await addCart({
      supermarket: 'Shoprite',
      items: [],
      isCompleted: false,
    });
    
    console.log('Carrinho criado:', newCart.id);
    router.push(`/screens/CartScreen?id=${newCart.id}`);
  } catch (error) {
    Alert.alert('Erro', 'Não foi possível criar o carrinho');
  }
};
```

### 3. Adicionar Item ao Carrinho

```typescript
const { addItemToCart, calculateCartTotal } = useCart();

const handleAddItem = async (cartId: string) => {
  try {
    await addItemToCart(cartId, {
      name: 'Arroz',
      price: 1200,
      quantity: 2,
      imageUri: 'file://...',
    });
    
    const newTotal = calculateCartTotal(cartId);
    console.log('Novo total:', newTotal);
  } catch (error) {
    Alert.alert('Erro', 'Não foi possível adicionar o item');
  }
};
```

### 4. Atualizar Item do Carrinho

```typescript
const { updateCartItem } = useCart();

const handleUpdateQuantity = async (cartId: string, itemId: string, newQuantity: number) => {
  try {
    await updateCartItem(cartId, itemId, {
      quantity: newQuantity,
    });
    // Total é recalculado automaticamente
  } catch (error) {
    Alert.alert('Erro', 'Não foi possível atualizar o item');
  }
};
```

### 5. Remover Item do Carrinho

```typescript
const { removeItemFromCart } = useCart();

const handleRemoveItem = async (cartId: string, itemId: string) => {
  Alert.alert(
    'Remover produto',
    'Tens certeza?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeItemFromCart(cartId, itemId);
            // Total é recalculado automaticamente
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível remover o item');
          }
        },
      },
    ]
  );
};
```

### 6. Trabalhar com Carrinho Atual

```typescript
const { currentCart, setCurrentCart } = useCart();

// Definir carrinho atual
useEffect(() => {
  if (cartId) {
    setCurrentCart(cartId);
  }
  
  return () => {
    setCurrentCart(null); // Limpar ao desmontar
  };
}, [cartId]);

// Usar carrinho atual
if (currentCart) {
  console.log('Items:', currentCart.items);
  console.log('Total:', currentCart.total);
}
```

### 7. Gerenciar Produtos

```typescript
const { products, addProduct, updateProduct, searchProducts } = useCart();

// Adicionar produto
const handleAddProduct = async () => {
  try {
    const newProduct = await addProduct({
      name: 'Óleo de Palma',
      category: 'Alimentação',
      lastPrice: 850,
      barcode: '123456789',
    });
    console.log('Produto criado:', newProduct.id);
  } catch (error) {
    Alert.alert('Erro', 'Não foi possível adicionar o produto');
  }
};

// Pesquisar produtos
const results = searchProducts('Arroz');
```

### 8. Atualizar Carrinho Completo

```typescript
const { updateCart } = useCart();

const handleCompleteCart = async (cartId: string) => {
  try {
    await updateCart(cartId, {
      isCompleted: true,
    });
    Alert.alert('Sucesso', 'Compra finalizada!');
  } catch (error) {
    Alert.alert('Erro', 'Não foi possível completar o carrinho');
  }
};
```

### 9. Deletar Carrinho

```typescript
const { deleteCart } = useCart();

const handleDeleteCart = async (cartId: string) => {
  Alert.alert(
    'Deletar carrinho',
    'Tens certeza? Esta ação não pode ser desfeita.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCart(cartId);
            router.back();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível deletar o carrinho');
          }
        },
      },
    ]
  );
};
```

## Estado de Carregamento

```typescript
const { isLoading } = useCart();

if (isLoading) {
  return <ActivityIndicator size="large" color="#2196F3" />;
}

return <YourContent />;
```

## Cálculo Automático de Total

O total do carrinho é **calculado automaticamente** sempre que:
- Um item é adicionado
- Um item é atualizado (preço ou quantidade)
- Um item é removido

Não é necessário calcular manualmente!

```typescript
const { carts } = useCart();

// O total já está calculado
const cart = carts[0];
console.log('Total:', cart.total); // Sempre atualizado
```

## Persistência Offline

Todas as operações são **automaticamente salvas** no AsyncStorage:
- ✅ Carrinhos persistem entre sessões
- ✅ Produtos persistem entre sessões
- ✅ Dados disponíveis offline
- ✅ Sincronização automática com storage

## TypeScript

Todos os tipos estão exportados:

```typescript
import { Cart, CartItem, Product } from '@/app/store/CartContext';

const myCart: Cart = {
  id: '123',
  supermarket: 'Kero',
  date: new Date().toISOString(),
  items: [],
  total: 0,
};
```
