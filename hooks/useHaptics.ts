import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Centralized utility hook for triggering vibration or haptic patterns
 * Works across Android, iOS, and web (via Web Vibration API).
 */
export function useHaptics() {
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  const webVibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      // @ts-ignore - TS lib may not include vibrate in Navigator type
      navigator.vibrate(pattern);
    }
  };

  // Light feedback for subtle actions like taps
  const smallHit = () => {
    if (isNative) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      webVibrate(50);
    }
  };

  // Medium feedback for standard interactions
  const mediumHit = () => {
    if (isNative) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      webVibrate(90);
    }
  };

  // Stronger feedback (e.g., error, reminder alarming)
  const heavyHit = () => {
    if (isNative) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      webVibrate(120);
    }
  };

  // Notification feedback patterns
  const success = () => {
    if (isNative) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      webVibrate([40, 40, 40]);
    }
  };

  const warning = () => {
    if (isNative) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      webVibrate([100, 50, 50]);
    }
  };

  const error = () => {
    if (isNative) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      webVibrate([120, 60, 120]);
    }
  };

  // Fallback for web vibration (exposed for custom patterns)
  const vibratePattern = (pattern: number[] = [100, 50, 100]) => {
    if (isNative) return; // prefer native haptics
    webVibrate(pattern);
  };

  // Repetitive alert for reminders
  const repetitiveAlert = async () => {
    if (isNative) {
      for (let i = 0; i < 3; i++) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await new Promise(res => setTimeout(res, 500));
      }
    } else {
      for (let i = 0; i < 3; i++) {
        webVibrate(100);
        await new Promise(res => setTimeout(res, 500));
      }
    }
  };

  // Selection feedback for UI interactions
  const selection = () => {
    if (isNative) {
      Haptics.selectionAsync();
    } else {
      webVibrate(50);
    }
  };

  return {
    smallHit,
    mediumHit,
    heavyHit,
    success,
    warning,
    error,
    vibratePattern,
    repetitiveAlert,
    selection,
  };
}
