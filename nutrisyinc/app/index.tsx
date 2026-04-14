import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Routes } from '@/constants/routes';
import { FontFamily, NutrilhoColors, Shadows, Spacing } from '@/constants/theme';

const THUMB = 56;
const THUMB_SIZE = THUMB - 12;
/** Fully rounded thumb (circle). */
const THUMB_RADIUS = THUMB_SIZE / 2;
const TRACK_H = 58;
const THRESHOLD = 0.72;
/** Base size before scaling; effective size = base × scale (capped to screen). */
const LOGO_BASE_PX = 132;
const LOGO_SCALE = 1.5;

/** Non-interactive preview aligned with `(tabs)` home so the fade reads as the real screen. */
function MainScreenPreview() {
  return (
    <View style={styles.mainPreviewRoot} pointerEvents="none">
      <SafeAreaView edges={['top']} style={styles.mainPreviewSafeTop}>
        <View style={styles.mainPreviewNavRow}>
          <View style={styles.mainPreviewNavGhost} />
          <View style={[styles.mainPreviewNavGhost, styles.mainPreviewNavGhostPrimary]} />
        </View>
      </SafeAreaView>
      <ScrollView
        style={styles.mainPreviewScroll}
        contentContainerStyle={styles.mainPreviewScrollContent}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}>
        <View style={styles.mainPreviewHero}>
          <Text style={styles.mainPreviewBadge}>🥦 Marketplace de Marmitas Personalizadas</Text>
          <Text style={styles.mainPreviewTitleBlock}>
            <Text style={styles.mainPreviewTitle}>Você tem a receita.</Text>
            {'\n'}
            <Text style={styles.mainPreviewTitleEm}>A gente entrega</Text>
            <Text style={styles.mainPreviewTitle}> a marmita.</Text>
          </Text>
          <View style={styles.mainPreviewPWrap}>
            <Text style={styles.mainPreviewP}>
              Envie o plano do seu nutricionista e cozinheiros parceiros montam suas marmitas exatamente como
              prescrito.
            </Text>
          </View>
          <View style={styles.mainPreviewCta} />
        </View>
      </ScrollView>
    </View>
  );
}

/** Thumb starts on the right; user drags left (negative translationX) to continue. */
export default function SplashRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const hasNavigated = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  /** 1 when system “Reduce motion” / “Remove animations” is on (for worklets). */
  const reduceMotionSV = useSharedValue(0);

  const heroPadX = 24;
  const logoSize = Math.min(LOGO_BASE_PX * LOGO_SCALE, windowWidth - heroPadX * 2);

  /** 0 = thumb at rest on the right; negative = dragged toward the left. */
  const translateX = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const maxDrag = useSharedValue(0);
  const hintOpacity = useSharedValue(1);

  const progress = useDerivedValue(() => {
    const m = maxDrag.value;
    if (m <= 0) return 0;
    return interpolate(-translateX.value, [0, m], [0, 1], Extrapolation.CLAMP);
  });

  const goMain = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace(Routes.tabs);
  }, [router]);

  const triggerExit = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goMain();
  }, [goMain]);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (!alive) return;
      setReduceMotion(v);
      reduceMotionSV.value = v ? 1 : 0;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      setReduceMotion(v);
      reduceMotionSV.value = v ? 1 : 0;
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [reduceMotionSV]);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(hintOpacity);
      hintOpacity.value = 1;
      return;
    }
    hintOpacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(hintOpacity);
  }, [hintOpacity, reduceMotion]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    maxDrag.value = Math.max(0, w - THUMB_SIZE - 12);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-22, 22])
    .onStart(() => {
      dragStart.value = translateX.value;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((e) => {
      const next = dragStart.value + e.translationX;
      translateX.value = Math.min(Math.max(-maxDrag.value, next), 0);
    })
    .onEnd(() => {
      const max = maxDrag.value;
      if (max <= 0) return;
      if (translateX.value < -max * THRESHOLD) {
        translateX.value = withTiming(-max, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(triggerExit)();
        });
      } else if (reduceMotionSV.value) {
        translateX.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 220, mass: 0.8 });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => {
    const m = maxDrag.value;
    const p = m > 0 ? -translateX.value / m : 0;
    return {
      width: `${interpolate(p, [0, 1], [6, 100], Extrapolation.CLAMP)}%`,
    };
  });

  /** Splash fades out as progress increases (no scale when reduce motion is on). */
  const splashLayerStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const op = interpolate(t, [0, 1], [1, 0], Extrapolation.CLAMP);
    const scale = reduceMotionSV.value
      ? 1
      : interpolate(t, [0, 1], [1, 0.985], Extrapolation.CLAMP);
    return { opacity: op, transform: [{ scale }] };
  });

  /** Home preview fades in with the same progress. */
  const mainLayerStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const op = interpolate(t, [0, 0.08, 1], [0, 1, 1], Extrapolation.CLAMP);
    const scale = reduceMotionSV.value ? 1 : interpolate(t, [0, 1], [1.02, 1], Extrapolation.CLAMP);
    return { opacity: op, transform: [{ scale }] };
  });

  const hintAnimStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value * (1 - progress.value),
  }));

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <View style={styles.stack}>
        <Animated.View style={[styles.layerFill, mainLayerStyle]} pointerEvents="none">
          <MainScreenPreview />
        </Animated.View>

        <Animated.View style={[styles.layerFill, splashLayerStyle]}>
          <View style={styles.hero}>
            <View style={[styles.logoIcon, { width: logoSize, height: logoSize }]}>
              <Image
                source={require('@/assets/images/logo.svg')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
            <Text style={styles.name}>Nutrilho</Text>
            <Text style={styles.tag}>sua receita, nossa marmita</Text>
          </View>

          <Animated.View
            style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <Animated.Text style={[styles.hint, hintAnimStyle]}>Deslize para continuar</Animated.Text>

            <View style={styles.trackOuter} onLayout={onTrackLayout}>
              <View style={styles.track}>
                <Animated.View style={[styles.trackFill, fillStyle]} />
                <Text style={styles.trackLabel} pointerEvents="none">
                  ← Arraste até o fim para entrar
                </Text>
                <GestureDetector gesture={pan}>
                  <Animated.View style={[styles.thumb, thumbStyle]}>
                    <Ionicons name="chevron-back" size={26} color={NutrilhoColors.white} />
                  </Animated.View>
                </GestureDetector>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  stack: {
    flex: 1,
  },
  layerFill: {
    ...StyleSheet.absoluteFillObject,
  },
  mainPreviewRoot: {
    flex: 1,
    backgroundColor: NutrilhoColors.cream,
  },
  mainPreviewSafeTop: {
    backgroundColor: NutrilhoColors.white,
  },
  mainPreviewNavRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.sectionPadX,
    paddingVertical: 10,
    minHeight: 48,
  },
  mainPreviewNavGhost: {
    width: 72,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  mainPreviewNavGhostPrimary: {
    backgroundColor: NutrilhoColors.green,
    opacity: 0.85,
  },
  mainPreviewScroll: {
    flex: 1,
  },
  mainPreviewScrollContent: {
    paddingBottom: Spacing.xl,
  },
  mainPreviewHero: {
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: Spacing.sectionPadX,
    alignItems: 'center',
    backgroundColor: NutrilhoColors.cream,
  },
  mainPreviewBadge: {
    fontFamily: FontFamily.sansSemiBold,
    backgroundColor: NutrilhoColors.greenL,
    color: NutrilhoColors.greenD,
    fontSize: 11,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74,124,47,0.25)',
    marginBottom: 16,
    letterSpacing: 0.3,
    overflow: 'hidden',
  },
  mainPreviewTitleBlock: {
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  mainPreviewTitle: {
    fontFamily: FontFamily.serifBold,
    fontSize: 28,
    fontWeight: '700',
    color: NutrilhoColors.text,
    lineHeight: 34,
  },
  mainPreviewTitleEm: {
    fontFamily: FontFamily.serifBoldItalic,
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '700',
    color: NutrilhoColors.green,
    lineHeight: 34,
  },
  mainPreviewPWrap: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    marginBottom: 8,
  },
  mainPreviewP: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NutrilhoColors.textM,
    textAlign: 'left',
    lineHeight: 24,
  },
  mainPreviewCta: {
    alignSelf: 'stretch',
    maxWidth: 400,
    width: '100%',
    marginTop: 12,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(74,124,47,0.2)',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
  bottom: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginTop: -52,
  },
  hint: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: NutrilhoColors.textM,
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  trackOuter: {
    width: '100%',
  },
  track: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: NutrilhoColors.beigeD,
    borderWidth: 1,
    borderColor: NutrilhoColors.beigeMid,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: NutrilhoColors.greenL,
    borderRadius: TRACK_H / 2,
  },
  trackLabel: {
    position: 'absolute',
    left: 16,
    right: THUMB_SIZE + 14,
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: NutrilhoColors.textL,
    textAlign: 'left',
  },
  thumb: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    backgroundColor: NutrilhoColors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryButton,
  },
});
