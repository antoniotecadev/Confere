import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { CartProvider } from '@/app/store/CartContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <CartProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="screens/SplashScreen" options={{ headerShown: false }} />
          <Stack.Screen name="screens/OnboardingScreen" options={{ headerShown: false }} />
          <Stack.Screen name="screens/HomeScreen" options={{ headerShown: false }} />
          <Stack.Screen name="screens/CartScreen" options={{ headerShown: false }} />
          <Stack.Screen name="screens/AddProductScreen" options={{ headerShown: false }} />
          <Stack.Screen name="screens/ComparisonScreen" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </CartProvider>
  );
}
