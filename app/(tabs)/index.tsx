import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Droplets, RefreshCw, Play, Pause, Square, Info, RotateCcw, Clock, Bell } from 'lucide-react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useHaptics } from '@/hooks/useHaptics';

const { width, height } = Dimensions.get('window');

// Enhanced responsive sizing with better calculations
const getResponsiveTimerSize = () => {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const availableHeight = screenHeight * 0.6; // Reserve space for controls
  const availableWidth = screenWidth * 0.9;
  const maxSize = Math.min(availableHeight, availableWidth, 350);
  const minSize = 250;
  
  return {
    size: Math.max(minSize, maxSize),
    strokeWidth: Math.max(maxSize * 0.03, 8),
    fontSize: Math.max(maxSize * 0.12, 32),
    subFontSize: Math.max(maxSize * 0.05, 14),
  };
};

const WATER_FACTS = [
  "Your brain is 75% water. Drink up for focus!",
  "Hydration improves brain function and mental clarity.",
  "Water boosts energy levels naturally throughout the day.",
  "Your body is approximately 60% water.",
  "Drinking water helps maintain proper body temperature.",
  "Staying hydrated keeps joints lubricated and healthy.",
  "Water supports healthy digestion and nutrient absorption.",
  "Proper hydration prevents constipation naturally.",
  "Water improves kidney function and flushes toxins.",
  "Staying hydrated reduces risk of kidney stones.",
  "Water helps maintain healthy blood pressure.",
  "Hydration improves heart health and circulation.",
  "Water helps prevent urinary tract infections.",
  "Proper hydration reduces dehydration headaches.",
  "Water improves skin hydration and elasticity.",
  "Staying hydrated promotes healthy hair growth.",
  "Water strengthens nails by keeping them hydrated.",
  "Proper hydration reduces bloating naturally.",
  "Water supports a healthy metabolism.",
  "Hydration helps regulate electrolyte balance.",
  "Water boosts calorie burning through thermogenesis.",
  "Staying hydrated helps suppress appetite naturally.",
  "Water reduces cravings for sugary drinks.",
  "Proper hydration improves exercise performance.",
  "Water reduces fatigue during workouts.",
  "Hydration speeds up muscle recovery.",
  "Water helps build muscle strength.",
  "Staying hydrated improves flexibility.",
  "Water increases endurance during activity.",
  "Proper hydration helps prevent injuries.",
  "Water improves focus and concentration.",
  "Staying hydrated boosts short-term memory.",
  "Water enhances overall brain function.",
  "Proper hydration reduces mental fatigue.",
  "Water supports better mood and emotional balance.",
  "Staying hydrated helps manage stress levels.",
  "Water reduces risk of brain fog.",
  "Proper hydration prevents dizziness.",
  "Water improves alertness and reaction time.",
  "Staying hydrated reduces risk of migraines.",
  "Water supports immune system function.",
  "Proper hydration helps prevent premature aging.",
  "Water helps regulate blood sugar levels.",
  "Staying hydrated supports hormone balance.",
  "Water improves circulation for organ health.",
  "Proper hydration promotes wound healing.",
  "Water may reduce risk of certain cancers.",
  "Staying hydrated supports healthy pregnancy.",
  "Water increases longevity by promoting health.",
  "Proper hydration improves sleep quality."
];

// Notification Service
class HydrationNotificationService {
  private static instance: HydrationNotificationService;
  private scheduledAlarms: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private serviceWorkerRegistered = false;

  static getInstance(): HydrationNotificationService {
    if (!HydrationNotificationService.instance) {
      HydrationNotificationService.instance = new HydrationNotificationService();
    }
    return HydrationNotificationService.instance;
  }

  async initialize() {
    if (Platform.OS === 'web') {
      await this.requestNotificationPermission();
      await this.registerServiceWorker();
    }
  }

  private async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator && !this.serviceWorkerRegistered) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        this.serviceWorkerRegistered = true;
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  scheduleAlarm(alarmId: string, clockTime: string, message: string, onTrigger: () => void) {
    // Clear any existing alarm with this ID
    this.clearAlarm(alarmId);

    const now = new Date();
    let alarmTime = new Date(now.toDateString() + ' ' + clockTime);
    
    // If the time has already passed today, schedule for tomorrow
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    const delay = alarmTime.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      this.showNotification(message, onTrigger);
      this.scheduledAlarms.delete(alarmId);
    }, delay);

    this.scheduledAlarms.set(alarmId, timeoutId);

    console.log(`Alarm scheduled for ${alarmTime.toLocaleString()}, delay: ${delay}ms`);
  }

  private async showNotification(message: string, onTrigger: () => void) {
    // Trigger the in-app callback first
    onTrigger();

    if (Platform.OS === 'web') {
      // Play notification sound
      this.playNotificationSound();
      
      // Trigger web vibration for notification
      this.triggerWebVibration();

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        const notification = new Notification('Time to Hydrate!', {
          body: message || 'Drink a glass of water for mental clarity.',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          // vibrate: [150, 50, 150], // Not supported in all browsers
          requireInteraction: true,
          tag: 'hydration-reminder'
          // actions: Not widely supported across browsers
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }

      // Also try service worker notification for background
      if (this.serviceWorkerRegistered && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification('Time to Hydrate!', {
            body: message || 'Drink a glass of water for mental clarity.',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            // vibrate: [150, 50, 150], // Not supported in all browsers
            requireInteraction: true,
            tag: 'hydration-reminder'
            // actions: Not widely supported across browsers
          });
        });
      }
    }
  }

  private playNotificationSound() {
    try {
      // Create a pleasant notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  private triggerWebVibration() {
    try {
      // Trigger vibration pattern for web notifications
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (error) {
      console.warn('Could not trigger web vibration:', error);
    }
  }

  clearAlarm(alarmId: string) {
    const timeoutId = this.scheduledAlarms.get(alarmId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledAlarms.delete(alarmId);
    }
  }

  clearAllAlarms() {
    this.scheduledAlarms.forEach(timeoutId => clearTimeout(timeoutId));
    this.scheduledAlarms.clear();
  }

  getPermissionStatus(): string {
    if (Platform.OS !== 'web' || !('Notification' in window)) {
      return 'not-supported';
    }
    return Notification.permission;
  }
}

export default function HydrateHome() {
  const [reminderInterval, setReminderInterval] = useState(30);
  const [dailyReminders, setDailyReminders] = useState(8);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [remindersRemaining, setRemindersRemaining] = useState(8);
  const [currentFact, setCurrentFact] = useState(WATER_FACTS[0]);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [isSnoozing, setIsSnoozing] = useState(false);
  const [snoozeTimeRemaining, setSnoozeTimeRemaining] = useState(0);
  const [timerSize, setTimerSize] = useState(getResponsiveTimerSize());
  const [isDragging, setIsDragging] = useState(false);
  
  // New notification states
  const [selectedTime, setSelectedTime] = useState('');
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [scheduledAlarms, setScheduledAlarms] = useState<string[]>([]);

  // Track component mounted state to prevent state updates on unmounted component
  const mounted = useRef(true);
  const notificationService = useRef(HydrationNotificationService.getInstance());
  
  // Haptic feedback hook
  const { smallHit, mediumHit, heavyHit, success, warning, error, selection } = useHaptics();

  const pulseAnim = useSharedValue(1);
  const factFadeAnim = useSharedValue(1);
  const rippleAnim = useSharedValue(0);
  const modalAnim = useSharedValue(0);
  const numberFlipAnim = useSharedValue(1);
  const ringPulseAnim = useSharedValue(1);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const panGesture = Gesture.Pan()
    .enabled(!isActive)
    .onStart(() => {
      if (isActive) return;
      setIsDragging(true);
      smallHit();
      ringPulseAnim.value = withSpring(1.05);
    })
    .onUpdate((event) => {
      if (isActive) return;

      const centerX = width / 2;
      const centerY = height / 2;
      const deltaX = event.absoluteX - centerX;
      const deltaY = event.absoluteY - centerY;

      let angle = Math.atan2(deltaY, deltaX);
      angle = angle * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const minutes = Math.max(1, Math.min(120, Math.round((angle / 360) * 119) + 1));

      if (minutes !== reminderInterval) {
        selection();

        numberFlipAnim.value = withSequence(
          withTiming(0, { duration: 80 }),
          withTiming(1, { duration: 80 })
        );

        setReminderInterval(minutes);
        setTimeRemaining(minutes * 60);
      }
    })
    .onEnd(() => {
      setIsDragging(false);
      ringPulseAnim.value = withSpring(1);
      mediumHit();
    });

  useEffect(() => {
    mounted.current = true;
    startAnimations();
    setRandomFact();
    initializeNotifications();
    
    // Enhanced resize listener
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (mounted.current) {
        setTimerSize(getResponsiveTimerSize());
      }
    });
    
    return () => {
      mounted.current = false;
      subscription?.remove();
      notificationService.current.clearAllAlarms();
    };
  }, []);

  const initializeNotifications = async () => {
    await notificationService.current.initialize();
    setNotificationPermission(notificationService.current.getPermissionStatus());
  };

  // Enhanced timer logic with snooze support
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && !isPaused) {
      if (isSnoozing && snoozeTimeRemaining > 0) {
        interval = setInterval(() => {
          setSnoozeTimeRemaining((prev) => {
            if (prev <= 1) {
              setIsSnoozing(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (!isSnoozing && timeRemaining > 0) {
        interval = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              handleReminderTrigger();
              return reminderInterval * 60;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, timeRemaining, isSnoozing, snoozeTimeRemaining, reminderInterval]);

  const startAnimations = () => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.01, { duration: 3000 }),
        withTiming(1, { duration: 3000 })
      ),
      -1,
      false
    );
  };

  const setRandomFact = () => {
    const randomFact = WATER_FACTS[Math.floor(Math.random() * WATER_FACTS.length)];
    requestAnimationFrame(() => {
      if (mounted.current) {
        setCurrentFact(randomFact);
      }
    });
  };

  const refreshFact = () => {
    smallHit();

    factFadeAnim.value = withSequence(
      withTiming(0, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );

    setTimeout(() => setRandomFact(), 150);
  };

  const handleReminderTrigger = () => {
    rippleAnim.value = withSequence(
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 300 })
    );

    success();

    setShowAlarmModal(true);
    showModalAnimation();
  };

  const showModalAnimation = () => {
    modalAnim.value = withSpring(1, {
      stiffness: 100,
      damping: 8,
    });
  };

  const hideModalAnimation = (callback?: () => void) => {
    modalAnim.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setShowAlarmModal(false);
      callback?.();
    }, 200);
  };

  const handleSnooze = () => {
    mediumHit();
    setIsSnoozing(true);
    setSnoozeTimeRemaining(5 * 60); // 5 minutes
    hideModalAnimation();
  };

  const handleMarkAsDone = () => {
    success();
    
    const newRemindersRemaining = remindersRemaining - 1;
    setRemindersRemaining(newRemindersRemaining);
    
    hideModalAnimation(() => {
      if (newRemindersRemaining === 0) {
        setIsActive(false);
        setIsPaused(false);
      } else {
        setTimeRemaining(reminderInterval * 60);
      }
    });
  };

  const startReminders = () => {
    mediumHit();
    setIsActive(true);
    setIsPaused(false);
    setIsSnoozing(false);
    setSnoozeTimeRemaining(0);
    setTimeRemaining(reminderInterval * 60);
    setRemindersRemaining(dailyReminders);
  };

  const pauseReminders = () => {
    smallHit();
    setIsPaused(true);
  };

  const resumeReminders = () => {
    smallHit();
    setIsPaused(false);
  };

  const stopReminders = () => {
    heavyHit();
    setIsActive(false);
    setIsPaused(false);
    setIsSnoozing(false);
    setSnoozeTimeRemaining(0);
    setTimeRemaining(reminderInterval * 60);
    setRemindersRemaining(dailyReminders);
    
    // Clear all scheduled alarms
    notificationService.current.clearAllAlarms();
    setScheduledAlarms([]);
  };

  const resetTimer = () => {
    mediumHit();
    setIsSnoozing(false);
    setSnoozeTimeRemaining(0);
    setTimeRemaining(reminderInterval * 60);
  };

  const scheduleClockAlarm = (time: string) => {
    if (!time) return;

    const alarmId = `alarm-${Date.now()}`;
    const message = "Drink a glass of water for mental clarity and better focus!";

    notificationService.current.scheduleAlarm(
      alarmId,
      time,
      message,
      () => {
        setShowAlarmModal(true);
        showModalAnimation();
      }
    );

    setScheduledAlarms(prev => [...prev, `${time} - Hydration Reminder`]);
    setSelectedTime('');
    setShowTimeSelector(false);

    success();
  };

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'web' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'denied') {
        Alert.alert(
          'Notifications Blocked',
          'Please enable notifications in your browser settings to receive hydration reminders.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress and colors
  const getTimerProgress = () => {
    if (isSnoozing) {
      return 1 - (snoozeTimeRemaining / (5 * 60));
    }
    return isActive ? 1 - (timeRemaining / (reminderInterval * 60)) : 0;
  };

  const getTimerColor = () => {
    if (isSnoozing) return '#F59E0B'; // Orange for snooze
    return isActive ? '#2563EB' : '#06B6D4'; // Blue for active, cyan for setting
  };

  const getCurrentTime = () => {
    if (isSnoozing) return snoozeTimeRemaining;
    return timeRemaining;
  };

  const getCurrentLabel = () => {
    if (isSnoozing) return 'snooze time left';
    if (isActive) return 'until next reminder';
    return 'minutes between reminders';
  };

  const animatedTimerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }, { scale: ringPulseAnim.value }],
  }));

  const animatedRippleStyle = useAnimatedStyle(() => ({
    opacity: rippleAnim.value,
    transform: [
      {
        scale: interpolate(
          rippleAnim.value,
          [0, 1],
          [0.8, 1.6],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const animatedNumberStyle = useAnimatedStyle(() => ({
    opacity: numberFlipAnim.value,
  }));

  const animatedFactStyle = useAnimatedStyle(() => ({
    opacity: factFadeAnim.value,
  }));

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: modalAnim.value,
    transform: [
      {
        scale: interpolate(modalAnim.value, [0, 1], [0.8, 1], Extrapolate.CLAMP),
      },
    ],
  }));

  const animatedModalIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <LinearGradient
        colors={['#F8FAFC', '#E0F2FE', '#BAE6FD']}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Droplets size={28} color="#2563EB" />
            </View>
            <Text style={styles.title}>Hydrate</Text>
          </View>

          {/* Notification Permission Banner */}
          {Platform.OS === 'web' && notificationPermission !== 'granted' && (
            <TouchableOpacity
              style={styles.permissionBanner}
              onPress={() => {
                smallHit();
                requestNotificationPermission();
              }}
            >
              <BlurView intensity={20} style={styles.permissionBlur}>
                <LinearGradient
                  colors={['rgba(37, 99, 235, 0.1)', 'rgba(6, 182, 212, 0.1)']}
                  style={styles.permissionGradient}
                >
                  <Bell size={20} color="#2563EB" />
                  <Text style={styles.permissionText}>
                    Enable notifications for hydration reminders
                  </Text>
                </LinearGradient>
              </BlurView>
            </TouchableOpacity>
          )}

          {/* Clock Time Alarm Section */}
          <View style={styles.clockAlarmSection}>
            <Text style={styles.sectionTitle}>Schedule Alarm</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                smallHit();
                setShowTimeSelector(true);
              }}
            >
              <BlurView intensity={20} style={styles.timeButtonBlur}>
                <LinearGradient
                  colors={['rgba(37, 99, 235, 0.1)', 'rgba(6, 182, 212, 0.1)']}
                  style={styles.timeButtonGradient}
                >
                  <Clock size={20} color="#2563EB" />
                  <Text style={styles.timeButtonText}>Set Alarm Time</Text>
                </LinearGradient>
              </BlurView>
            </TouchableOpacity>

            {scheduledAlarms.length > 0 && (
              <View style={styles.scheduledAlarms}>
                <Text style={styles.scheduledTitle}>Scheduled Alarms:</Text>
                {scheduledAlarms.map((alarm, index) => (
                  <View key={index} style={styles.alarmItem}>
                    <Text style={styles.alarmText}>{alarm}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Rebuilt Center Timer Circle */}
          <View style={styles.timerSection}>
            <GestureDetector gesture={panGesture}>
              <Animated.View
                style={[
                  styles.newTimerContainer,
                  {
                    width: timerSize.size,
                    height: timerSize.size,
                  },
                  animatedTimerStyle,
                ]}
              >
                {/* Ripple Effect */}
                <Animated.View
                  style={[
                    styles.newRippleEffect,
                    {
                      width: timerSize.size,
                      height: timerSize.size,
                      borderRadius: timerSize.size / 2,
                    },
                    animatedRippleStyle,
                  ]}
                />

              <BlurView intensity={25} style={[styles.newTimerBlur, { borderRadius: timerSize.size / 2 }]}>
                <LinearGradient
                  colors={['rgba(37, 99, 235, 0.15)', 'rgba(6, 182, 212, 0.1)', 'rgba(255, 255, 255, 0.2)']}
                  style={[styles.newTimerGradient, { borderRadius: timerSize.size / 2 }]}
                >
                  {/* Enhanced Progress Ring */}
                  <View style={[styles.newProgressRing, { 
                    width: timerSize.size * 0.85, 
                    height: timerSize.size * 0.85,
                    borderRadius: timerSize.size * 0.425 
                  }]}>
                    {/* Background Track */}
                    <View style={[styles.newBackgroundRing, { 
                      borderRadius: timerSize.size * 0.425,
                      borderWidth: timerSize.strokeWidth,
                      borderColor: 'rgba(37, 99, 235, 0.2)'
                    }]} />
                    
                    {/* Animated Progress Fill */}
                    {(isActive || isSnoozing) && (
                      <Animated.View style={[
                        styles.newProgressFill,
                        {
                          borderRadius: timerSize.size * 0.425,
                          borderWidth: timerSize.strokeWidth,
                          borderColor: getTimerColor(),
                          transform: [
                            { rotate: `${getTimerProgress() * 360}deg` }
                          ]
                        }
                      ]} />
                    )}
                    
                    {/* Interactive Indicator for Setting Mode */}
                    {!isActive && !isSnoozing && (
                      <View style={[
                        styles.newRotationIndicator,
                        {
                          borderRadius: timerSize.size * 0.425,
                          transform: [
                            { rotate: `${((reminderInterval - 1) / 119) * 360}deg` }
                          ]
                        }
                      ]}>
                        <View style={[styles.newIndicatorDot, {
                          width: timerSize.strokeWidth * 1.5,
                          height: timerSize.strokeWidth * 1.5,
                          borderRadius: timerSize.strokeWidth * 0.75,
                          top: -(timerSize.strokeWidth * 0.75),
                          marginLeft: -(timerSize.strokeWidth * 0.75),
                          backgroundColor: isDragging ? '#06B6D4' : '#2563EB'
                        }]} />
                      </View>
                    )}
                  </View>
                  
                  {/* Enhanced Center Display */}
                  <View style={styles.newTimerContent}>
                    <Animated.View style={animatedNumberStyle}>
                      <Text style={[styles.newTimerText, {
                        fontSize: timerSize.fontSize,
                        color: getTimerColor()
                      }]}>
                        {isActive || isSnoozing ? formatTime(getCurrentTime()) : reminderInterval}
                      </Text>
                    </Animated.View>
                    
                    <Text style={[styles.newTimerLabel, { 
                      fontSize: timerSize.subFontSize,
                      color: isSnoozing ? '#F59E0B' : '#64748B'
                    }]}>
                      {getCurrentLabel()}
                    </Text>
                    
                    {isActive && !isSnoozing && (
                      <>
                        <Text style={[styles.newRemindersText, { fontSize: timerSize.subFontSize * 0.8 }]}>
                          {remindersRemaining} reminders left today
                        </Text>
                      </>
                    )}
                    
                    {!isActive && !isSnoozing && (
                      <Text style={[styles.newInstructionText, { fontSize: timerSize.subFontSize * 0.7 }]}>
                        Drag the ring to adjust
                      </Text>
                    )}
                  </View>
                </LinearGradient>
              </BlurView>
              </Animated.View>
            </GestureDetector>
          </View>

          {/* Enhanced Control Buttons */}
          <View style={styles.newControlSection}>
            {!isActive ? (
              <TouchableOpacity
                style={[styles.newStartButton, { width: Math.min(timerSize.size * 1.2, width * 0.8) }]}
                onPress={startReminders}
              >
                <BlurView intensity={20} style={styles.newControlBlur}>
                  <LinearGradient
                    colors={['#2563EB', '#1D4ED8']}
                    style={styles.newControlGradient}
                  >
                    <Play size={20} color="white" />
                    <Text style={styles.newControlText}>Start Hydration Reminder</Text>
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>
            ) : (
              <View style={styles.newActiveControls}>
                <TouchableOpacity
                  style={styles.newSmallControlButton}
                  onPress={isPaused ? resumeReminders : pauseReminders}
                >
                  <BlurView intensity={20} style={styles.newSmallControlBlur}>
                    <LinearGradient
                      colors={['#06B6D4', '#0891B2']}
                      style={styles.newSmallControlGradient}
                    >
                      {isPaused ? <Play size={18} color="white" /> : <Pause size={18} color="white" />}
                    </LinearGradient>
                  </BlurView>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.newSmallControlButton}
                  onPress={resetTimer}
                >
                  <BlurView intensity={20} style={styles.newSmallControlBlur}>
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.newSmallControlGradient}
                    >
                      <RotateCcw size={18} color="white" />
                    </LinearGradient>
                  </BlurView>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.newSmallControlButton}
                  onPress={stopReminders}
                >
                  <BlurView intensity={20} style={styles.newSmallControlBlur}>
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      style={styles.newSmallControlGradient}
                    >
                      <Square size={18} color="white" />
                    </LinearGradient>
                  </BlurView>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Daily Reminders Selector */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingLabel}>Daily reminders</Text>
            <View style={styles.dailyRemindersContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.dailyReminderButton,
                    dailyReminders === count && styles.dailyReminderButtonActive
                  ]}
                  onPress={() => {
                    if (!isActive) {
                      selection();
                      setDailyReminders(count);
                      setRemindersRemaining(count);
                    }
                  }}
                  disabled={isActive}
                >
                  <Text style={[
                    styles.dailyReminderButtonText,
                    dailyReminders === count && styles.dailyReminderButtonTextActive
                  ]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Water Fact Card */}
          <View style={styles.factSection}>
            <BlurView intensity={30} style={styles.factCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                style={styles.factGradient}
              >
                <View style={styles.factHeader}>
                  <Info size={20} color="#2563EB" />
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={refreshFact}
                  >
                    <RefreshCw size={18} color="#06B6D4" />
                  </TouchableOpacity>
                </View>

                <Animated.View style={animatedFactStyle}>
                  <Text style={styles.factText}>{currentFact}</Text>
                </Animated.View>
              </LinearGradient>
            </BlurView>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Time Selector Modal */}
      <Modal
        visible={showTimeSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timeSelectorContainer}>
            <BlurView intensity={40} style={styles.timeSelectorBlur}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(248, 250, 252, 0.9)']}
                style={styles.timeSelectorGradient}
              >
                <Text style={styles.timeSelectorTitle}>Set Alarm Time</Text>
                
                <View style={styles.timeInputContainer}>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    style={{
                      fontSize: 18,
                      padding: 12,
                      borderRadius: 12,
                      border: '2px solid #2563EB',
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      color: '#1E293B',
                      fontFamily: 'Inter',
                      fontWeight: '600',
                    }}
                  />
                </View>
                
                <View style={styles.timeSelectorButtons}>
                  <TouchableOpacity
                    style={styles.timeCancelButton}
                    onPress={() => {
                      smallHit();
                      setShowTimeSelector(false);
                    }}
                  >
                    <Text style={styles.timeCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.timeSetButton}
                    onPress={() => scheduleClockAlarm(selectedTime)}
                    disabled={!selectedTime}
                  >
                    <LinearGradient
                      colors={['#2563EB', '#1D4ED8']}
                      style={styles.timeSetGradient}
                    >
                      <Text style={styles.timeSetText}>Set Alarm</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* Enhanced Alarm Modal */}
      <Modal
        visible={showAlarmModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => handleMarkAsDone()}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
            <BlurView intensity={40} style={styles.modalBlur}>
              <LinearGradient
                colors={['rgba(37, 99, 235, 0.95)', 'rgba(6, 182, 212, 0.9)']}
                style={styles.modalGradient}
              >
                {/* Animated Droplet Icon */}
                <Animated.View style={[styles.modalIcon, animatedModalIconStyle]}>
                  <Droplets size={48} color="white" />
                </Animated.View>
                
                <Text style={styles.modalTitle}>Time to Hydrate!</Text>
                <Text style={styles.modalMessage}>
                  Drink a glass of water for mental clarity and better focus.
                </Text>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.snoozeButton}
                    onPress={handleSnooze}
                  >
                    <BlurView intensity={20} style={styles.modalButtonBlur}>
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.modalButtonGradient}
                      >
                        <Text style={styles.modalButtonText}>Snooze 5min</Text>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={handleMarkAsDone}
                  >
                    <BlurView intensity={20} style={styles.modalButtonBlur}>
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.modalButtonGradient}
                      >
                        <Text style={styles.modalButtonText}>I Drank Water!</Text>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </BlurView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#1E293B',
  },
  
  // Permission Banner
  permissionBanner: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  permissionBlur: {
    flex: 1,
  },
  permissionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563EB',
  },
  
  // Clock Alarm Section
  clockAlarmSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  timeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timeButtonBlur: {
    flex: 1,
  },
  timeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  timeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#2563EB',
  },
  scheduledAlarms: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  scheduledTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748B',
    marginBottom: 8,
  },
  alarmItem: {
    paddingVertical: 4,
  },
  alarmText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#475569',
  },
  
  // Time Selector Modal
  timeSelectorContainer: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  timeSelectorBlur: {
    flex: 1,
  },
  timeSelectorGradient: {
    padding: 32,
    alignItems: 'center',
  },
  timeSelectorTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 24,
  },
  timeInputContainer: {
    marginBottom: 32,
  },
  timeSelectorButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  timeCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeCancelText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748B',
  },
  timeSetButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  timeSetGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSetText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
  
  timerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  // New Timer Styles
  newTimerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  newRippleEffect: {
    position: 'absolute',
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
    zIndex: -1,
  },
  newTimerBlur: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  newTimerGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  newProgressRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBackgroundRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  newProgressFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  newRotationIndicator: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  newIndicatorDot: {
    position: 'absolute',
    left: '50%',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  newTimerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTimerText: {
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  newTimerLabel: {
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: 4,
  },
  newRemindersText: {
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  newInstructionText: {
    fontFamily: 'Inter_400Regular',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  
  // New Control Styles
  newControlSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  newStartButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  newControlBlur: {
    flex: 1,
  },
  newControlGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  newControlText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
  newActiveControls: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newSmallControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  newSmallControlBlur: {
    flex: 1,
  },
  newSmallControlGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Settings Section
  settingsSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  dailyRemindersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    maxWidth: '100%',
  },
  dailyReminderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dailyReminderButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dailyReminderButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#64748B',
  },
  dailyReminderButtonTextActive: {
    color: 'white',
  },
  
  // Fact Section
  factSection: {
    paddingTop: 20,
  },
  factCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  factGradient: {
    padding: 20,
  },
  factHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  factText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#475569',
    lineHeight: 22,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  modalBlur: {
    flex: 1,
  },
  modalGradient: {
    padding: 32,
    alignItems: 'center',
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  snoozeButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  doneButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalButtonBlur: {
    flex: 1,
  },
  modalButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: 'white',
  },
});