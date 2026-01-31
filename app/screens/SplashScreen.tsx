import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ONBOARDING_KEY = '@confere:hasSeenOnboarding';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Aguarda 2.5 segundos antes de navegar
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Verifica se o usuário já viu o onboarding
      const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
      
      if (hasSeenOnboarding === 'true') {
        // Navega para Home (tabs)
        router.replace('/(tabs)');
      } else {
        // Navega para Onboarding
        router.replace('/screens/OnboardingScreen');
      }
    } catch (error) {
      console.error('Erro ao verificar status do onboarding:', error);
      // Em caso de erro, vai para tabs
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo placeholder - substitua com seu logo real */}
      <View style={styles.logoContainer}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>CONFERE</Text>
        </View>
      </View>

      {/* Slogan */}
      <Text style={styles.slogan}>Antes de pagar, Confere.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  slogan: {
    fontSize: 18,
    color: '#333333',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
