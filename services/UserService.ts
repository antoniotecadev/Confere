import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const USER_ID_KEY = '@confere_user_id';
const DEVICE_INFO_KEY = '@confere_device_info';

export interface DeviceInfo {
  model: string;
  brand: string;
  osVersion: string;
  appVersion: string;
}

class UserServiceClass {
  private userId: string | null = null;
  private deviceInfo: DeviceInfo | null = null;

  /**
   * Gera ou recupera o ID único do usuário
   */
  async getUserId(): Promise<string> {
    if (this.userId) {
      return this.userId;
    }

    // Tentar recuperar ID existente
    let storedId = await AsyncStorage.getItem(USER_ID_KEY);

    if (!storedId) {
      // Gerar novo UUID
      storedId = Crypto.randomUUID();
      await AsyncStorage.setItem(USER_ID_KEY, storedId);
    }

    this.userId = storedId;
    return storedId;
  }

  /**
   * Obtém informações do dispositivo
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    // Tentar recuperar do cache
    const cached = await AsyncStorage.getItem(DEVICE_INFO_KEY);
    if (cached) {
      this.deviceInfo = JSON.parse(cached);
      return this.deviceInfo!;
    }

    // Coletar informações do dispositivo
    const info: DeviceInfo = {
      model: Application.nativeApplicationVersion || 'Unknown',
      brand: Application.applicationName || 'Confere',
      osVersion: `${Platform.OS} ${Platform.Version}`,
      appVersion: Application.nativeApplicationVersion || '1.0.0',
    };

    await AsyncStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(info));
    this.deviceInfo = info;
    return info;
  }

  /**
   * Limpa dados do usuário (útil para testes)
   */
  async clearUserData(): Promise<void> {
    await AsyncStorage.multiRemove([USER_ID_KEY, DEVICE_INFO_KEY]);
    this.userId = null;
    this.deviceInfo = null;
  }
}

export const UserService = new UserServiceClass();
