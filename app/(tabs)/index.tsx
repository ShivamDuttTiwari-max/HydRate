import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import CenterTimerClock from '@/components/CenterTimerClock';
import {
  cancelAllReminders,
  ensureNotificationPermissions,
  scheduleReminder,
} from '@/src/notifications/notifications';
import { registerServiceWorkerAndSubscribe } from '@/src/webPush';
import { setupSoundListener } from '@/src/notificationSoundPlayer';

const permissionCopy = {
  title: 'Enable Reminders?',
  body: 'Allow reminders so we can alert you to drink water even when your screen is locked. We’ll use a short gentle sound and vibration.',
};

const webLimitationsCopy =
  'Browsers typically block custom notification sounds when the tab is backgrounded or the device is locked. For reliable locked-screen audio + vibration, use an EAS-built native app.';

const vapidPublicKey = process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_KEY ?? '';

export default function HydrateHome() {
  const [minutes, setMinutes] = useState(30);
  const [notifAllowed, setNotifAllowed] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Checking notification permission…');
  const [webSubscription, setWebSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (isWeb) {
      setupSoundListener();
    }
  }, [isWeb]);

  const ensurePermissions = useCallback(async () => {
    setIsRequestingPermission(true);
    const granted = await ensureNotificationPermissions();
    setNotifAllowed(granted);
    setIsRequestingPermission(false);

    if (granted) {
      setStatusMessage('Notifications enabled. Set the timer to schedule reminders.');
      if (isWeb) {
        if (!vapidPublicKey) {
          setStatusMessage('Add EXPO_PUBLIC_WEB_PUSH_VAPID_KEY to use web push subscriptions.');
          return;
        }
        try {
          const subscription = await registerServiceWorkerAndSubscribe(vapidPublicKey);
          if (subscription) {
            setWebSubscription(subscription.toJSON());
            setStatusMessage('Web push subscription ready. Keep this tab open for best reliability.');
          }
        } catch (error) {
          console.warn('Web push registration failed', error);
          setStatusMessage('Web push registration failed. Check console for details.');
        }
      }
      } else {
      setStatusMessage('Notifications are required for reminders. Enable them in Settings.');
    }
  }, [isWeb]);

  useEffect(() => {
    ensurePermissions();
  }, [ensurePermissions]);

  const handleMinutesChange = useCallback(
    (value: number) => {
      setMinutes(value);
      if (notifAllowed === null) {
        ensurePermissions();
      }
    },
    [ensurePermissions, notifAllowed],
  );

  const handleToggle = useCallback(
    async (nextActive: boolean) => {
      if (!notifAllowed) {
        setIsActive(false);
        Alert.alert(
          permissionCopy.title,
          permissionCopy.body,
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => {
                Linking.openSettings?.();
              },
            },
            { text: 'Grant permission', onPress: ensurePermissions },
          ],
          { cancelable: true },
        );
        return;
      }

      setIsActive(nextActive);

      if (nextActive) {
        setStatusMessage(`Reminders scheduled every ${minutes} minute${minutes === 1 ? '' : 's'}.`);
        await cancelAllReminders();
        await scheduleReminder({
          seconds: minutes * 60,
          repeats: true,
          title: 'Time to hydrate 💧',
          body: `Take a sip — ${minutes}-minute interval`,
        });
      } else {
        await cancelAllReminders();
        setStatusMessage('Reminders paused.');
      }
    },
    [ensurePermissions, minutes, notifAllowed],
  );

  const PermissionCTA = () => {
    if (notifAllowed !== false) return null;
  return (
      <LinearGradient colors={['rgba(37,99,235,0.12)', 'rgba(6,182,212,0.12)']} style={styles.permissionCard}>
        <Text style={styles.permissionTitle}>{permissionCopy.title}</Text>
        <Text style={styles.permissionBody}>{permissionCopy.body}</Text>
        <View style={styles.permissionButtons}>
          <Pressable style={styles.permissionButton} onPress={ensurePermissions} disabled={isRequestingPermission}>
            <Text style={styles.permissionButtonText}>
              {isRequestingPermission ? 'Requesting…' : 'Enable notifications'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.permissionButton, styles.secondaryButton]}
            onPress={() => Linking.openSettings?.()}
          >
            <Text style={[styles.permissionButtonText, styles.secondaryButtonText]}>Open settings</Text>
          </Pressable>
            </View>
                </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#ECF2FF', '#F8FDFF']} style={styles.background}>
        <View style={styles.content}>
          <Text style={styles.title}>Hydrate</Text>
          <Text style={styles.subtitle}>Lock-screen hydration reminders with sound + vibration.</Text>

          <View style={styles.clockWrapper}>
            <CenterTimerClock
              initialMinutes={minutes}
              onMinutesChange={handleMinutesChange}
              onToggle={handleToggle}
              externalActive={isActive}
            />
            {!notifAllowed && <View pointerEvents="none" style={styles.disabledOverlay} />}
                  </View>
                  
          <PermissionCTA />

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Status</Text>
            <Text style={styles.statusMessage}>{statusMessage}</Text>
                    
            {isActive && (
              <Text style={styles.statusDetail}>
                Reminders repeat every {minutes} minute{minutes === 1 ? '' : 's'}. Turn them off any time by tapping the
                clock.
                        </Text>
                    )}
                    
            {isWeb && (
              <>
                <Text style={styles.statusDetail}>{webLimitationsCopy}</Text>
                {webSubscription && (
                  <Text style={styles.statusDetail}>
                    Web push subscription endpoint: {webSubscription.endpoint ?? 'ready'}.
                      </Text>
                    )}
              </>
            )}

            <Text style={styles.statusDetail}>
              Custom sounds require an EAS build or `expo prebuild` so the WAV lands in Android `res/raw` and the iOS
              bundle. Expo Go uses default sounds.
                  </Text>
            </View>
          </View>
              </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ECF2FF',
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
  },
  clockWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.4)',
    borderRadius: 200,
  },
  permissionCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  permissionBody: {
    fontSize: 14,
    color: '#1E293B',
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  permissionButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  secondaryButtonText: {
    color: '#2563EB',
  },
  statusCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 16,
    gap: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusMessage: {
    fontSize: 14,
    color: '#1E293B',
  },
  statusDetail: {
    fontSize: 13,
    color: '#475569',
  },
});