import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityInfo,
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

type TimerColorState = {
  isActive: boolean;
  isSnoozing: boolean;
  isAdjusting: boolean;
};

type Props = {
  initialMinutes?: number;
  onMinutesChange?: (minutes: number) => void;
  onToggle?: (isActive: boolean) => void;
  onComplete?: () => void;
  isSnoozing?: boolean;
  externalActive?: boolean;
};

const MIN = 1;
const MAX = 120;
const FULL_CIRCLE = 360;
const HAPTIC_THROTTLE_MS = 200;
const RING_PADDING = 18;
const STROKE_WIDTH = 10;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CenterTimerClock({
  initialMinutes = 30,
  onMinutesChange,
  onToggle,
  onComplete,
  isSnoozing = false,
  externalActive,
}: Props) {
  const clampedInitial = clamp(initialMinutes, MIN, MAX);
  const [minutes, setMinutes] = useState<number>(clampedInitial);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(!!externalActive);
  const [remainingSeconds, setRemainingSeconds] = useState(
    clampedInitial * 60,
  );

  const animatedProgress = useRef(
    new Animated.Value((clampedInitial - MIN) / (MAX - MIN)),
  ).current;
  const rippleScale = useRef(new Animated.Value(1)).current;

  const totalSecondsRef = useRef(clampedInitial * 60);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const rippleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastHapticTs = useRef(0);
  const isMountedRef = useRef(true);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopCountdown();
      stopRipple();
    };
  }, []);

  useEffect(() => {
    if (typeof externalActive === 'boolean') {
      setIsActive(externalActive);
    }
  }, [externalActive]);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive) {
      startRipple();
    } else {
      stopRipple();
      stopCountdown();
      animateToSelection(minutes);
    }
  }, [isActive, minutes]);

  useEffect(() => {
    if (!isActive) {
      totalSecondsRef.current = minutes * 60;
      setRemainingSeconds(totalSecondsRef.current);
    }
  }, [minutes, isActive]);

  useEffect(() => {
    const announcement = `Timer ${minutes} minutes. ${
      isActive ? 'Running' : 'Idle'
    }`;
    AccessibilityInfo.announceForAccessibility?.(announcement);
  }, [minutes, isActive]);

  const radius = useMemo(() => {
    const size = Math.min(layout.width, layout.height);
    return Math.max(size / 2 - RING_PADDING, 0);
  }, [layout]);

  const circumference = useMemo(() => {
    const r = Math.max(radius - STROKE_WIDTH / 2, 0);
    return 2 * Math.PI * r;
  }, [radius]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const announceMinutesChange = useCallback(
    (value: number) => {
      AccessibilityInfo.announceForAccessibility?.(
        `Timer set to ${value} minutes`,
      );
    },
    [],
  );

  const maybeHapticSelection = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticTs.current > HAPTIC_THROTTLE_MS) {
      Haptics.selectionAsync();
      lastHapticTs.current = now;
    }
  }, []);

  const coordsToAngle = useCallback(
    (x: number, y: number) => {
      const cx = layout.width / 2;
      const cy = layout.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const rad = Math.atan2(dy, dx);
      const deg = (rad * 180) / Math.PI;
      const degFromTop = (deg + 450) % 360; // shift so 0deg = top
      return degFromTop;
    },
    [layout],
  );

  const angleToMinutes = useCallback((angleDeg: number) => {
    const normalized = ((angleDeg % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE;
    const value = Math.round((normalized / FULL_CIRCLE) * (MAX - MIN)) + MIN;
    return clamp(value, MIN, MAX);
  }, []);

  const updateMinutesFromTouch = useCallback(
    (locationX: number, locationY: number) => {
      if (!layout.width || !layout.height || isActiveRef.current) {
        return;
      }
      const angle = coordsToAngle(locationX, locationY);
      const nextMinutes = angleToMinutes(angle);
      setMinutes((prev) => {
        if (prev !== nextMinutes) {
          maybeHapticSelection();
          onMinutesChange?.(nextMinutes);
          announceMinutesChange(nextMinutes);
          animateToSelection(nextMinutes);
        }
        return nextMinutes;
      });
    },
    [
      angleToMinutes,
      announceMinutesChange,
      coordsToAngle,
      layout.height,
      layout.width,
      maybeHapticSelection,
      onMinutesChange,
    ],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e: GestureResponderEvent) => {
        if (isActiveRef.current) {
          return false;
        }
        return e.nativeEvent.touches.length === 1;
      },
      onMoveShouldSetPanResponder: (
        _: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        if (isActiveRef.current || gestureState.numberActiveTouches > 1) {
          return false;
        }
        return Math.abs(gestureState.dx) + Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: (e: GestureResponderEvent) => {
        if (isActiveRef.current) {
          return;
        }
        setIsAdjusting(true);
        updateMinutesFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        if (isActiveRef.current) {
          return;
        }
        updateMinutesFromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderRelease: () => {
        if (isActiveRef.current) {
          return;
        }
        setIsAdjusting(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        setIsAdjusting(false);
      },
    }),
  ).current;

  const animateToSelection = useCallback(
    (value: number) => {
      const ratio = (value - MIN) / (MAX - MIN);
      progressAnimRef.current?.stop();
      progressAnimRef.current = Animated.timing(animatedProgress, {
        toValue: ratio,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      });
      progressAnimRef.current.start(() => {
        progressAnimRef.current = null;
      });
    },
    [animatedProgress],
  );

  const animateCountdown = useCallback(
    (totalSeconds: number) => {
      progressAnimRef.current?.stop();
      animatedProgress.setValue(1);
      progressAnimRef.current = Animated.timing(animatedProgress, {
        toValue: 0,
        duration: totalSeconds * 1000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      });
      progressAnimRef.current.start(({ finished }) => {
        if (finished && isMountedRef.current) {
          handleComplete();
        }
      });
    },
    [animatedProgress],
  );

  const startCountdown = useCallback(
    (totalSeconds: number) => {
      totalSecondsRef.current = totalSeconds;
      setRemainingSeconds(totalSeconds);
      animateCountdown(totalSeconds);
      countdownIntervalRef.current && clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const next = Math.max(prev - 1, 0);
          return next;
        });
      }, 1000);
    },
    [animateCountdown],
  );

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    progressAnimRef.current?.stop();
    progressAnimRef.current = null;
  }, []);

  const startRipple = useCallback(() => {
    rippleLoopRef.current?.stop();
    rippleScale.setValue(1);
    rippleLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(rippleScale, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(rippleScale, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    rippleLoopRef.current.start();
  }, [rippleScale]);

  const stopRipple = useCallback(() => {
    rippleLoopRef.current?.stop();
    rippleLoopRef.current = null;
    Animated.timing(rippleScale, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [rippleScale]);

  const handleComplete = useCallback(() => {
    stopCountdown();
    setIsActive(false);
    setRemainingSeconds(minutes * 60);
    onToggle?.(false);
    onComplete?.();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    animateToSelection(minutes);
  }, [animateToSelection, minutes, onComplete, onToggle, stopCountdown]);

  const handleToggle = useCallback(() => {
    const shouldActivate = !isActive;
    setIsActive(shouldActivate);
    onToggle?.(shouldActivate);
    if (shouldActivate) {
      startCountdown(minutes * 60);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      stopCountdown();
      animateToSelection(minutes);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [
    animateToSelection,
    isActive,
    minutes,
    onToggle,
    startCountdown,
    stopCountdown,
  ]);

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'activate') {
        handleToggle();
        return;
      }
      if (event.nativeEvent.actionName === 'increment' && !isActive) {
        const next = clamp(minutes + 1, MIN, MAX);
        setMinutes(next);
        onMinutesChange?.(next);
        animateToSelection(next);
      }
      if (event.nativeEvent.actionName === 'decrement' && !isActive) {
        const next = clamp(minutes - 1, MIN, MAX);
        setMinutes(next);
        onMinutesChange?.(next);
        animateToSelection(next);
      }
    },
    [animateToSelection, handleToggle, isActive, minutes, onMinutesChange],
  );

  const displayedMinutes = isActive
    ? Math.max(1, Math.ceil(remainingSeconds / 60))
    : minutes;
  const displayedLabel = isActive ? 'remaining' : 'minutes';
  const timerColor = getTimerColor({
    isActive,
    isAdjusting,
    isSnoozing: !!isSnoozing,
  });

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.rippleWrapper,
          {
            transform: [{ scale: rippleScale }],
            opacity: isActive ? 1 : 0.4,
          },
        ]}
      >
        <View
          style={[
            styles.ripple,
            { borderColor: `${timerColor}33`, shadowColor: timerColor },
          ]}
        />
      </Animated.View>

      <View style={styles.centerTouchArea} {...panResponder.panHandlers}>
        <LinearGradient
          colors={[
            'rgba(37,99,235,0.15)',
            'rgba(6,182,212,0.12)',
            'rgba(255,255,255,0.18)',
          ]}
          style={styles.centerGradient}
        >
          <View style={styles.blurOverlay} />
          <Pressable
            onPress={handleToggle}
            accessibilityRole="button"
            accessibilityLabel={`Timer ${displayedMinutes} ${displayedLabel}`}
            accessibilityState={{ busy: isActive, selected: isActive }}
            focusable
            accessibilityActions={[
              { name: 'activate', label: 'Toggle timer' },
              { name: 'increment', label: 'Increase minutes' },
              { name: 'decrement', label: 'Decrease minutes' },
            ]}
            onAccessibilityAction={handleAccessibilityAction}
            style={styles.svgWrapper}
          >
            {radius > 0 && (
              <Svg
                width={radius * 2 + STROKE_WIDTH}
                height={radius * 2 + STROKE_WIDTH}
                viewBox={`0 0 ${radius * 2 + STROKE_WIDTH} ${
                  radius * 2 + STROKE_WIDTH
                }`}
              >
                <G
                  rotation={-90}
                  originX={(radius * 2 + STROKE_WIDTH) / 2}
                  originY={(radius * 2 + STROKE_WIDTH) / 2}
                >
                  <Circle
                    cx={(radius * 2 + STROKE_WIDTH) / 2}
                    cy={(radius * 2 + STROKE_WIDTH) / 2}
                    r={Math.max(0, radius - STROKE_WIDTH / 2)}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                  />
                  <AnimatedCircle
                    cx={(radius * 2 + STROKE_WIDTH) / 2}
                    cy={(radius * 2 + STROKE_WIDTH) / 2}
                    r={Math.max(0, radius - STROKE_WIDTH / 2)}
                    stroke={timerColor}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={`${circumference}, ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                  />
                </G>
              </Svg>
            )}

            <View pointerEvents="none" style={styles.centerTextWrap}>
              <Text style={[styles.minutesText, { color: timerColor }]}>
                {displayedMinutes}
              </Text>
              <Text style={styles.labelText}>{displayedLabel}</Text>
            </View>
          </Pressable>
        </LinearGradient>
      </View>
    </View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getTimerColor({
  isActive,
  isSnoozing,
  isAdjusting,
}: TimerColorState) {
  if (isSnoozing) return '#F59E0B';
  if (isActive) return '#2563EB';
  if (isAdjusting) return '#0EA5E9';
  return '#06B6D4';
}

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleWrapper: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  centerTouchArea: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerGradient: {
    width: 260,
    height: 260,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  svgWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minutesText: {
    fontSize: 46,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelText: {
    marginTop: 2,
    fontSize: 14,
    letterSpacing: 1,
    color: 'rgba(15,23,42,0.55)',
    textTransform: 'uppercase',
  },
});

