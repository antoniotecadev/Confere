/**
 * NotificationService — Notificações de lembrete do Confere
 *
 * Estratégia:
 *  - Dias de compras mais prováveis em Angola: Sexta, Sábado, Domingo, dia 1 e dia 15 do mês
 *    (sexta = véspera do fim-de-semana, 1 e 15 = dias de salário mais comuns)
 *  - Hora: 10:00 da manhã — depois do pequeno-almoço, antes do rush do meio-dia
 *  - Uma notificação por gatilho, repetição automática (weekly / monthly)
 *  - Mensagens variadas para não parecerem spam
 *  - Só pede permissão + agenda uma única vez; reagenda se a versão da app mudar
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Identificadores dos 5 gatilhos ──────────────────────────────────────────
const IDS = {
  FRIDAY: 'confere_notif_friday',
  SATURDAY: 'confere_notif_saturday',
  SUNDAY: 'confere_notif_sunday',
  FIRST: 'confere_notif_day1',
  FIFTEENTH: 'confere_notif_day15',
};

// Chave do AsyncStorage que guarda a versão com que agendámos pela última vez
const SCHEDULED_VERSION_KEY = 'confere_notif_scheduled_version';
// Versão actual desta lógica — muda este número sempre que alterar as notificações
const SCHEDULE_VERSION = '2';

// ── Mensagens variadas (angolanas e simpáticas) ──────────────────────────────
const MESSAGES: Record<keyof typeof IDS, { title: string; body: string }> = {
  FRIDAY: {
    title: '🛒 Fim-de-semana de compras aí vem!',
    body: 'Já preparaste a lista? Abre o Confere e nunca mais pagues a mais no supermercado.',
  },
  SATURDAY: {
    title: '💰 Sábado é dia de abastecer!',
    body: 'Shoprite, Kero ou Candando hoje? Deixa o Confere conferir tudo no caixa por ti.',
  },
  SUNDAY: {
    title: '🧾 Último dia para as compras da semana',
    body: 'Não saias de casa sem o Confere. Cada Kwanza conta!',
  },
  FIRST: {
    title: '🎉 Mês novo, compras novas!',
    body: 'Já recebeste? Faz as compras do mês com o Confere e fica a par de tudo o que gastas.',
  },
  FIFTEENTH: {
    title: '📊 Metade do mês — como estão as compras?',
    body: 'Abre o Confere para ver as tuas estatísticas e saber quanto ainda podes gastar.',
  },
};

// ── Configura como as notificações aparecem quando a app está em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Cria o canal Android (obrigatório para Android 8+) ──────────────────────
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('confere_reminders', {
    name: 'Lembretes de Compras',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2196F3',
    sound: 'confere-notification.wav',
  });

  await Notifications.setNotificationChannelAsync('push-messages', {
    name: 'Notificações de Mensagens',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#2196F3',
    sound: 'confere-notification.wav',
  });
}

// ── Pede permissão ao utilizador ─────────────────────────────────────────────
async function requestPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Cancela apenas os nossos identificadores ─────────────────────────────────
async function cancelOurNotifications() {
  await Promise.all(Object.values(IDS).map(id =>
    Notifications.cancelScheduledNotificationAsync(id).catch(() => {/* ignora se não existe */ })
  ));
}

// ── Agenda as 5 notificações recorrentes ─────────────────────────────────────
async function scheduleAll() {
  const hour = 10;
  const minute = 0;

  // Sexta-feira (weekday 6 — ISO: 1=Dom … 7=Sáb; expo usa 1=Dom, 6=Sex, 7=Sáb)
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.FRIDAY,
    content: {
      title: MESSAGES.FRIDAY.title,
      body: MESSAGES.FRIDAY.body,
      sound: "confere-notification.wav",
      data: { screen: 'Home' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 6, hour, minute },
  });

  // Sábado (weekday 7)
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.SATURDAY,
    content: {
      title: MESSAGES.SATURDAY.title,
      body: MESSAGES.SATURDAY.body,
      sound: "confere-notification.wav",
      data: { screen: 'Home' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 7, hour, minute },
  });

  // Domingo (weekday 1)
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.SUNDAY,
    content: {
      title: MESSAGES.SUNDAY.title,
      body: MESSAGES.SUNDAY.body,
      sound: "confere-notification.wav",
      data: { screen: 'Home' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour, minute },
  });

  // Dia 1 do mês
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.FIRST,
    content: {
      title: MESSAGES.FIRST.title,
      body: MESSAGES.FIRST.body,
      sound: "confere-notification.wav",
      data: { screen: 'Home' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 1, hour, minute },
  });

  // Dia 15 do mês
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.FIFTEENTH,
    content: {
      title: MESSAGES.FIFTEENTH.title,
      body: MESSAGES.FIFTEENTH.body,
      sound: "confere-notification.wav",
      data: { screen: 'Home' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: 15, hour, minute },
  });
}

// ── Ponto de entrada principal — chamado no _layout.tsx ──────────────────────
export async function initNotifications(): Promise<void> {
  try {
    // Verifica se já agendámos com esta versão
    const savedVersion = await AsyncStorage.getItem(SCHEDULED_VERSION_KEY);
    if (savedVersion === SCHEDULE_VERSION) return; // já está tudo agendado

    const granted = await requestPermission();
    if (!granted) return; // utilizador recusou — não insistir

    await ensureAndroidChannel();
    await cancelOurNotifications();
    await scheduleAll();

    // Guarda a versão para não reagendar desnecessariamente
    await AsyncStorage.setItem(SCHEDULED_VERSION_KEY, SCHEDULE_VERSION);
  } catch (error) {
    // Silencioso — notificações são um plus, não devem quebrar a app
    console.warn('[NotificationService] Erro ao inicializar notificações:', error);
  }
}

// ── Cancela tudo (usado em ecrã de definições se o utilizador quiser desligar)
export async function disableNotifications(): Promise<void> {
  await cancelOurNotifications();
  await AsyncStorage.removeItem(SCHEDULED_VERSION_KEY);
}

// ── Reativa (após desligar)
export async function enableNotifications(): Promise<void> {
  await AsyncStorage.removeItem(SCHEDULED_VERSION_KEY);
  await initNotifications();
}

// ── ID do projecto Expo (necessário para gerar o push token) ─────────────────
const EXPO_PROJECT_ID = 'affbe6e4-fe21-440a-89bd-0dac3e1e0fb5';
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Obtém o Expo Push Token do dispositivo actual.
 * Retorna null se não for possível (emulador sem GMS, permissão negada, etc.)
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
    return tokenData.data;
  } catch (error) {
    console.warn('[NotificationService] Não foi possível obter push token:', error);
    return null;
  }
}

/**
 * Envia uma push notification para um token Expo específico.
 * Usa a API pública da Expo (não necessita de servidor).
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        data,
        sound: 'confere-notification.wav',
        priority: 'high',
        channelId: 'push-messages',
      }),
    });

    const rawBody = await response.text();
    let result: any = null;
    try {
      result = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      console.warn('[NotificationService] Resposta não-JSON da Expo Push API:', response.status, rawBody);
      return;
    }

    if (!response.ok) {
      console.warn('[NotificationService] Falha HTTP ao enviar push:', response.status, result ?? rawBody);
      return;
    }

    const ticket = result?.data;
    const isTicketError = ticket?.status === 'error';
    if (isTicketError) {
      console.warn('[NotificationService] Expo Push Ticket com erro:', ticket?.details ?? ticket);
      return;
    }

    console.log('[NotificationService] Expo Push Ticket OK:', ticket?.id ?? ticket);
  } catch (error) {
    console.warn('[NotificationService] Erro ao enviar push notification:', error);
  }
}
