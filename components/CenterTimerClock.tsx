import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, G } from 'react-native-svg';

type Props = {
  initialMinutes?: number; // 1..120
  onMinutesChange?: (m: number) => void;
  onToggle?: (active: boolean) => void;
  isSnoozing?: boolean;
  // if your app manages running state externally, pass them in
  externalActive?: boolean;
};

const MIN = 1;
const MAX = 120;
const FULL_CIRCLE = 360;

export default function CenterTimerClock({
  initialMinutes = 30,
  onMinutesChange,
  onToggle,
  isSnoozing = false,
  externalActive,
}: Props) {
  // state
  const [minutes, setMinutes] = useState<number>(clamp(initialMinutes, MIN, MAX));
  const [isActive, setIsActive] = useState<boolean>(!!externalActive);
  const [layout, setLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const adjustingRef = useRef(false);

  useEffect(() => {
    if (typeof externalActive === 'boolean') setIsActive(externalActive);
  }, [externalActive]);

  // Animated values
  const animatedProgress = useRef(new Animated.Value((minutes - MIN) / (MAX - MIN))).current; // 0..1
  const rippleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    animateProgress((minutes - MIN) / (MAX - MIN));
  }, [minutes]);

  useEffect(() => {
    if (isActive) startRipple();
    else stopRipple();
  }, [isActive]);

  // Prevent haptics flooding
  const lastHapticTs = useRef<number>(0);

  const maybeHapticSelection = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticTs.current > 80) {
      Haptics.selectionAsync();
      lastHapticTs.current = now;
    }
  }, []);

  // sizing helpers
  const radius = useMemo(() => Math.min(layout.width, layout.height) / 2 - 18, [layout]); // padding 18
  const strokeWidth = 10;
  const circumference = useMemo(() => 2 * Math.PI * Math.max(0, radius - strokeWidth / 2), [radius]);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  }

  // Convert angle to minutes (1..120). We map top (12 o'clock) = 0deg -> minute 1.
  function angleToMinutes(angleDeg: number) {
    // angleDeg expected 0..360, 0 at top, clockwise
    const normalized = ((angleDeg % 360) + 360) % 360; // 0..360
    // map 0..360 -> 0..(MAX - MIN)
    const value = Math.round((normalized / FULL_CIRCLE) * (MAX - MIN)) + MIN;
    return clamp(value, MIN, MAX);
  }

  function minutesToAngle(mins: number) {
    const ratio = (mins - MIN) / (MAX - MIN);
    return ratio * FULL_CIRCLE; // 0..360
  }

  // get color helper matching your project's logic
  function getTimerColor(localIsActive = isActive) {
    if (isSnoozing) return '#F59E0B';
    return localIsActive ? '#2563EB' : '#06B6D4';
  }

  // Animated helpers
  function animateProgress(value: number) {
    Animated.timing(animatedProgress, {
      toValue: value,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }

  function startRipple() {
    rippleScale.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(rippleScale, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(rippleScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }

  function stopRipple() {
    rippleScale.stopAnimation();
    Animated.timing(rippleScale, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }

  // Touch math: get angle in degrees from touch event relative to center
  function coordsToAngle(pageX: number, pageY: number) {
    // We need the absolute layout on screen to compute center: use measure? Simpler: component provides local coords via PanResponder (gestureState.x0 + dx) so we will use local coords below.
    // This method expects coords relative to component's top-left.
    const cx = layout.width / 2;
    const cy = layout.height / 2;
    const dx = pageX - cx;
    const dy = pageY - cy;
    // atan2 returns -PI..PI, with 0 at x+, so we convert so 0 at top.
    const rad = Math.atan2(dy, dx); // 0 at right, positive down
    const deg = (rad * 180) / Math.PI; // -180..180 where 0 = right
    // Convert so 0 = top: subtract 90 degrees
    const degFromTop = deg + 90;
    const normalized = (degFromTop + 360) % 360; // 0..360 with 0 = top, clockwise positive
    return normalized;
  }

  // We'll create a PanResponder that accepts touches inside a generous circle so taps are easy to hit.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e: GestureResponderEvent) => true,
      onMoveShouldSetPanResponder: (e: GestureResponderEvent, s: PanResponderGestureState) => true,
      onPanResponderGrant: (e, s) => {
        adjustingRef.current = true;
        const { locationX, locationY } = e.nativeEvent;
        // compute angle and minutes
        const angle = coordsToAngle(locationX, locationY);
        const m = angleToMinutes(angle);
        setMinutes((prev) => {
          if (prev !== m) {
            maybeHapticSelection();
            onMinutesChange?.(m);
          }
          return m;
        });
      },
      onPanResponderMove: (e, s) => {
        const { locationX, locationY } = e.nativeEvent;
        const angle = coordsToAngle(locationX, locationY);
        const m = angleToMinutes(angle);
        setMinutes((prev) => {
          if (prev !== m) {
            maybeHapticSelection();
            onMinutesChange?.(m);
          }
          return m;
        });
      },
      onPanResponderRelease: (e, s) => {
        adjustingRef.current = false;
        // small confirm haptic
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        adjustingRef.current = false;
      },
    })
  ).current;

  // Toggle start/stop when tapping center
  const handleToggle = useCallback(() => {
    const newActive = !isActive;
    setIsActive(newActive);
    onToggle?.(newActive);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [isActive, onToggle]);

  // Accessibility announcement
  useEffect(() => {
    const label = `Timer ${minutes} minutes. ${isActive ? 'Running' : 'Not running'}`;
    AccessibilityInfo.setAccessibilityFocus && AccessibilityInfo.announceForAccessibility(label);
  }, [minutes, isActive]);

  // SVG dashoffset binding
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const currentColor = getTimerColor();

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Animated.View style={[styles.rippleWrapper, { transform: [{ scale: rippleScale }] }]} pointerEvents="none">
        <View style={[styles.ripple, { borderColor: 'rgba(37,99,235,0.3)' }]} />
      </Animated.View>

      <View style={styles.centerTouchArea} {...panResponder.panHandlers}>
        <LinearGradient
          colors={['rgba(37, 99, 235, 0.15)', 'rgba(6, 182, 212, 0.1)', 'rgba(255, 255, 255, 0.2)']}
          style={[styles.centerGradient]}
        >
          <View
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Timer ${minutes} minutes`}
            accessibilityHint="Double tap to start or stop the timer"
            style={styles.svgWrapper}
          >
            {radius > 0 ? (
              <Svg
                width={radius * 2 + strokeWidth}
                height={radius * 2 + strokeWidth}
                viewBox={`0 0 ${radius * 2 + strokeWidth} ${radius * 2 + strokeWidth}`}
              >
                <G rotation={-90} originX={(radius * 2 + strokeWidth) / 2} originY={(radius * 2 + strokeWidth) / 2}>
                  {/* background ring */}
                  <Circle
                    cx={(radius * 2 + strokeWidth) / 2}
                    cy={(radius * 2 + strokeWidth) / 2}
                    r={Math.max(0, radius - strokeWidth / 2)}
                    stroke={'rgba(6,182,212,0.18)'}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    fill="transparent"
                  />

                  {/* progress ring -- Animated by strokeDashoffset */}
                  <AnimatedCircle
                    cx={(radius * 2 + strokeWidth) / 2}
                    cy={(radius * 2 + strokeWidth) / 2}
                    r={Math.max(0, radius - strokeWidth / 2)}
                    stroke={currentColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={`${circumference}, ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                  />
                </G>
              </Svg>
            ) : null}

            <View style={styles.centerTextWrap} pointerEvents="none">
              <Text style={[styles.minutesText, { color: currentColor }]}>{minutes}</Text>
              <Text style={styles.labelText}>{minutes === 1 ? 'minute' : 'minutes'}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

// Helper AnimatedCircle because react-native-svg's Circle doesn't accept Animated.Value directly for strokeDashoffset on some platforms
const AnimatedCircle = Animated.createAnimatedComponent(Circle as any);

// Small utility functions
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    // make this flexible — parent should size it. Provide a default size.
    width: 320,
    height: 320,
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
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.12,
    shadowRadius: 20,
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
    borderColor: 'rgba(255,255,255,0.08)'
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
    fontSize: 44,
    fontWeight: '700',
  },
  labelText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.45)',
  },
});

