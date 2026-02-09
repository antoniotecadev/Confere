import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@confere:hasSeenOnboarding';

export default function SplashScreen() {
  const router = useRouter();

  // Animações
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(30)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkRotate = useRef(new Animated.Value(0)).current;
  const particleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startAnimations();
    checkOnboardingStatus();
  }, []);

  const startAnimations = () => {
    // Sequência de animações
    Animated.sequence([
      // 1. Logo aparece com bounce
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 800,
          easing: Easing.elastic(1),
          useNativeDriver: true,
        }),
      ]),
      // 2. Checkmark aparece
      Animated.parallel([
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkRotate, {
          toValue: 1,
          duration: 500,
          easing: Easing.back(2),
          useNativeDriver: true,
        }),
      ]),
      // 3. Título e subtítulo aparecem
      Animated.parallel([
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(titleTranslateY, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(subtitleOpacity, {
            toValue: 1,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
          }),
          Animated.spring(subtitleTranslateY, {
            toValue: 0,
            friction: 8,
            delay: 200,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();

    // Partículas brilham continuamente
    Animated.loop(
      Animated.sequence([
        Animated.timing(particleOpacity, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(particleOpacity, {
          toValue: 0.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkOnboardingStatus = async () => {
    try {
      // Aguarda 3 segundos para animação
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verifica se o usuário já viu o onboarding
      const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
      
      if (hasSeenOnboarding === 'true') {
        router.replace('/screens/HomeScreen');
      } else {
        router.replace('/screens/OnboardingScreen');
      }
    } catch (error) {
      console.error('Erro ao verificar status do onboarding:', error);
      router.replace('/screens/HomeScreen');
    }
  };

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const checkmarkRotateInterpolate = checkmarkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });

  return (
    <LinearGradient
      colors={['#1565C0', '#2196F3', '#42A5F5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}>
      {/* Círculos de fundo decorativos */}
      <View style={styles.backgroundCircles}>
        <Animated.View style={[styles.circle, styles.circle1, { opacity: particleOpacity }]} />
        <Animated.View style={[styles.circle, styles.circle2, { opacity: particleOpacity }]} />
        <Animated.View style={[styles.circle, styles.circle3, { opacity: particleOpacity }]} />
      </View>

      <View style={styles.content}>
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          {/* Ícone do carrinho animado */}
          <Animated.View
            style={[
              styles.cartIcon,
              {
                transform: [
                  { scale: logoScale },
                  { rotate: logoRotateInterpolate },
                ],
              },
            ]}>
            <Ionicons name="cart" size={80} color="#FFFFFF" />
          </Animated.View>

          {/* Checkmark de confirmação */}
          <Animated.View
            style={[
              styles.checkmark,
              {
                transform: [
                  { scale: checkmarkScale },
                  { rotate: checkmarkRotateInterpolate },
                ],
              },
            ]}>
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={32} color="#4CAF50" />
            </View>
          </Animated.View>
        </View>

        {/* Título */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
          <Text style={styles.title}>Confere</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>

        {/* Subtítulo */}
        <Animated.View
          style={[
            styles.subtitleContainer,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}>
          <Text style={styles.subtitle}>Nunca Mais Pague a Mais! 💰</Text>
          <Text style={styles.tagline}>A tua proteção contra erros de cobrança</Text>
        </Animated.View>
      </View>

      {/* Footer com flag */}
      <Animated.View style={[styles.footer, { opacity: subtitleOpacity }]}>
        <Text style={styles.footerText}>🇦🇴 Feito em Angola</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundCircles: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -150,
    right: -150,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -100,
  },
  circle3: {
    width: 150,
    height: 150,
    top: height * 0.3,
    left: width * 0.7,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  cartIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  checkmarkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleUnderline: {
    width: 120,
    height: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    marginTop: 8,
  },
  subtitleContainer: {
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.8,
  },
});
