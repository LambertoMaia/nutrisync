import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { LogoIcon } from '@/components/prototype/LogoIcon';
import { FontFamily, NutrilhoColors } from '@/constants/theme';
import { logoSize } from '@/constants/prototypeTheme';

const C = {
  greenD: '#2e5a18',
  cream: '#faf7f2',
  textL: '#8a7a65',
  trackBg: '#e8e4dc',
  thumbBg: '#fff',
};

const BRAND_SCALE = 1.1;
const EXIT_NAV_DELAY_MS = 950;
const SPLASH_START_DELAY_MS = 280;

const TRACK_PAD_H = 6;
const THUMB = 40;
const TRACK_H = 48;
const THRESHOLD = 0.78;

export default function SplashRoute() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const brandScale = useSharedValue(1);
  const trackWidth = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const swipeOpacity = useSharedValue(1);
  /** Prevents double-firing completion from the pan gesture (UI thread). */
  const guestExitScheduled = useSharedValue(0);

  const guestExitStarted = useRef(false);

  const brandBlockStyle = useAnimatedStyle(() => ({
    transform: [{ scale: brandScale.value }],
  }));

  const swipeBarStyle = useAnimatedStyle(() => ({
    opacity: swipeOpacity.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  const runExitLoggedIn = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    brandScale.value = withTiming(BRAND_SCALE, { duration: 520 });
    setTimeout(() => {
      const u = userRef.current;
      if (u?.tipo === 'cliente') {
        router.replace('/home');
      } else {
        router.replace('/(tabs)');
      }
    }, EXIT_NAV_DELAY_MS);
  }, [brandScale, router]);

  /**
   * JS-only: haptics + deferred navigation. Do not mutate Reanimated shared values here
   * when triggered from a gesture worklet — that combination can crash (Reanimated 4 / worklets).
   */
  const onGuestSwipeFinishedJS = useCallback(() => {
    if (guestExitStarted.current) return;
    guestExitStarted.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      router.replace('/(tabs)');
    }, EXIT_NAV_DELAY_MS);
  }, [router]);

  /** Stable reference for runOnJS (no inline arrows). */
  const onGuestSwipeFinishedJSRef = useRef(onGuestSwipeFinishedJS);
  onGuestSwipeFinishedJSRef.current = onGuestSwipeFinishedJS;

  const runGuestCompleteOnJS = useCallback(() => {
    onGuestSwipeFinishedJSRef.current();
  }, []);

  const onTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      trackWidth.value = e.nativeEvent.layout.width;
    },
    [trackWidth],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          dragStart.value = dragX.value;
        })
        .onUpdate((e) => {
          'worklet';
          const m = Math.max(0, trackWidth.value - 2 * TRACK_PAD_H - THUMB);
          dragX.value = Math.min(Math.max(0, dragStart.value + e.translationX), m);
        })
        .onEnd(() => {
          'worklet';
          const m = Math.max(0, trackWidth.value - 2 * TRACK_PAD_H - THUMB);
          const p = m > 0 ? dragX.value / m : 0;
          if (p >= THRESHOLD) {
            if (guestExitScheduled.value === 1) {
              return;
            }
            guestExitScheduled.value = 1;
            dragX.value = withTiming(m, { duration: 160 });
            swipeOpacity.value = withTiming(0, { duration: 280 });
            brandScale.value = withTiming(BRAND_SCALE, { duration: 520 });
            runOnJS(runGuestCompleteOnJS)();
          } else {
            dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        }),
    // Shared values + runGuestCompleteOnJS are stable; empty deps keep one gesture instance (avoids native churn).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    const start = setTimeout(() => {
      runExitLoggedIn();
    }, SPLASH_START_DELAY_MS);
    return () => clearTimeout(start);
  }, [loading, user, runExitLoggedIn]);

  const isGuest = !loading && !user;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.splashColumn}>
          <Animated.View style={[styles.brandBlock, brandBlockStyle]}>
            <LogoIcon size={logoSize.splash} style={styles.logoSplash} />
            <Text style={styles.name}>Nutrilho</Text>
            <Text style={styles.tag}>sua receita, nossa marmita</Text>
          </Animated.View>
        </View>

        {isGuest ? (
          <Animated.View style={[styles.swipeWrap, swipeBarStyle]} pointerEvents="box-none">
            <Text style={styles.swipeHint}>Deslize para continuar</Text>
            <View style={styles.trackOuter} onLayout={onTrackLayout}>
              <GestureDetector gesture={pan}>
                <Animated.View style={[styles.thumb, thumbStyle]}>
                  <MaterialIcons name="arrow-forward" size={22} color={C.greenD} />
                </Animated.View>
              </GestureDetector>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  splashColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandBlock: {
    alignItems: 'center',
  },
  logoSplash: {
    marginBottom: 20,
  },
  name: {
    fontFamily: FontFamily.serifBold,
    fontSize: 32,
    fontWeight: '700',
    color: NutrilhoColors.greenD,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tag: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: NutrilhoColors.textL,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  swipeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  swipeHint: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textL,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  trackOuter: {
    width: '100%',
    maxWidth: 400,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: C.trackBg,
    paddingHorizontal: TRACK_PAD_H,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    left: TRACK_PAD_H,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: C.thumbBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
});
