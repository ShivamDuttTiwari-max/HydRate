import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import * as Asset from 'expo-asset';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system';

const CHANNEL_ID = 'reminder-channel';
let cachedSoundUri: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type ScheduleReminderOptions = {
  seconds?: number;
  title?: string;
  body?: string;
  channelId?: string;
  repeats?: boolean;
};

export async function ensureNotificationPermissions(): Promise<boolean> {
  const legacy = await Permissions.getAsync(Permissions.NOTIFICATIONS);
  if (legacy.status === 'granted') {
    await ensureAndroidChannel();
    return true;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') {
    await ensureAndroidChannel();
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  if (status === 'granted') {
    await ensureAndroidChannel();
    return true;
  }

  return false;
}

export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await ensureSoundAssetAsync();
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Hydration Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 80, 140],
    sound: 'water_reminder',
    bypassDnd: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.NOTIFICATION,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  });
}

export async function scheduleReminder(options: ScheduleReminderOptions = {}) {
  const { seconds = 60, title = 'Drink water 💧', body = 'Time to hydrate', channelId = CHANNEL_ID, repeats = true } = options;
  await ensureSoundAssetAsync();

  const content: Notifications.NotificationContentInput = {
    title,
    body,
    data: {
      type: 'hydration-reminder',
      appId: Application.applicationId,
      intervalSeconds: seconds,
    },
  };

  if (Platform.OS === 'ios') {
    content.sound = 'water_reminder.wav';
  } else if (Platform.OS === 'android') {
    content.channelId = channelId;
  }

  return Notifications.scheduleNotificationAsync({
    content,
    trigger: { seconds, repeats },
  });
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

async function ensureSoundAssetAsync() {
  if (cachedSoundUri) {
    return cachedSoundUri;
  }

  const soundAsset = Asset.fromModule(require('../../assets/sounds/water_reminder.wav'));
  await soundAsset.downloadAsync();

  if (Platform.OS === 'web') {
    cachedSoundUri = soundAsset.uri;
    return cachedSoundUri;
  }

  const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ''}water_reminder.wav`;
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    const from = soundAsset.localUri || soundAsset.uri;
    if (from) {
      await FileSystem.copyAsync({ from, to: fileUri });
    }
  }

  cachedSoundUri = fileUri;
  return cachedSoundUri;
}

export { CHANNEL_ID as HYDRATION_CHANNEL_ID };

