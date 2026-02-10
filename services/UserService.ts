import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const USER_ID_KEY = '@confere_user_id';
const DEVICE_INFO_KEY = '@confere_device_info';
const TRANSFER_CODE_KEY = 'confere_transfer_code'; // SecureStore key

export interface DeviceInfo {
  model: string;
  brand: string;
  osVersion: string;
  appVersion: string;
  deviceId: string; // ID único do hardware
  deviceName: string;
}

class UserServiceClass {
  private userId: string | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private transferCode: string | null = null;

  /**
   * Gera ou recupera o ID único do usuário
   * Agora baseado em: deviceId + transferCode para permitir migração
   */
  async getUserId(): Promise<string> {
    if (this.userId) {
      return this.userId;
    }

    // Tentar recuperar ID existente
    let storedId = await AsyncStorage.getItem(USER_ID_KEY);

    if (!storedId) {
      // Gerar novo UUID baseado no dispositivo
      const deviceId = await this.getDeviceId();
      storedId = `${deviceId}-${Crypto.randomUUID().slice(0, 8)}`;
      await AsyncStorage.setItem(USER_ID_KEY, storedId);
    }

    this.userId = storedId;
    return storedId;
  }

  /**
   * Obtém ID único do dispositivo (hardware-based)
   */
  private async getDeviceId(): Promise<string> {
    // Usar identificadores de hardware quando disponíveis
    if (Platform.OS === 'android') {
      return Device.osBuildId || Crypto.randomUUID();
    } else if (Platform.OS === 'ios') {
      // iOS não permite acesso ao UDID, usar identificador persistente
      let deviceId = await SecureStore.getItemAsync('device_identifier');
      if (!deviceId) {
        deviceId = Crypto.randomUUID();
        await SecureStore.setItemAsync('device_identifier', deviceId);
      }
      return deviceId;
    }
    return Crypto.randomUUID();
  }

  /**
   * Gera código de transferência (6 dígitos)
   * Permite migrar Premium para novo dispositivo
   */
  async generateTransferCode(): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await SecureStore.setItemAsync(TRANSFER_CODE_KEY, code);
    this.transferCode = code;
    return code;
  }

  /**
   * Verifica código de transferência
   */
  async validateTransferCode(code: string): Promise<boolean> {
    const storedCode = await SecureStore.getItemAsync(TRANSFER_CODE_KEY);
    return storedCode === code;
  }

  /**
   * Obtém código de transferência atual
   */
  async getTransferCode(): Promise<string | null> {
    if (this.transferCode) {
      return this.transferCode;
    }
    this.transferCode = await SecureStore.getItemAsync(TRANSFER_CODE_KEY);
    return this.transferCode;
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
    const deviceId = await this.getDeviceId();
    const info: DeviceInfo = {
      model: Device.modelName || 'Unknown',
      brand: Device.brand || 'Unknown',
      osVersion: `${Platform.OS} ${Device.osVersion || Platform.Version}`,
      appVersion: Application.nativeApplicationVersion || '1.0.0',
      deviceId,
      deviceName: Device.deviceName || 'Dispositivo',
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
