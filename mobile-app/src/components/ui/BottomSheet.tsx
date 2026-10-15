import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '../../theme';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTranslation } from 'react-i18next';

export interface BottomSheetProps {
  visible: boolean;
  /** Called on backdrop tap, drag-down, Android back, and the close button. */
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Sticky area under the content (primary action). Safe-area padded. */
  footer?: React.ReactNode;
  /** Max height as a fraction of the window (default 0.85). */
  maxHeightRatio?: number;
  /** Wrap children in a ScrollView (default true). Pass false when children include a FlatList. */
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

const OPEN_MS = 260;

/** Modal bottom sheet with backdrop, drag-to-dismiss handle and keyboard avoidance. */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightRatio = 0.85,
  scrollable = true,
  contentStyle,
}: BottomSheetProps) {
  const { t } = useTranslation('common');
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(windowHeight);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = windowHeight;
      translateY.value = withTiming(0, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
      backdrop.value = withTiming(1, { duration: OPEN_MS });
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(windowHeight, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // Only react to visibility changes; shared values are stable refs.
  }, [visible]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) runOnJS(onClose)();
      else translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  const body = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flexShrink, contentStyle]}>{children}</View>
  );

  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('actions.close')} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheet,
              { maxHeight: windowHeight * maxHeightRatio, paddingBottom: footer ? 0 : insets.bottom + spacing.sm },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.header}>
                <View style={styles.handle} />
                {(title || subtitle) && (
                  <View style={styles.titleRow}>
                    <View style={styles.flex}>
                      {title && <Text variant="h2">{title}</Text>}
                      {subtitle && (
                        <Text variant="bodySm" color="textSecondary" style={styles.subtitle}>
                          {subtitle}
                        </Text>
                      )}
                    </View>
                    <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityLabel={t('actions.close')}>
                      <Icon name="close" size={20} color="textSecondary" />
                    </Pressable>
                  </View>
                )}
              </View>
            </GestureDetector>
            {body}
            {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View>}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  backdrop: { backgroundColor: colors.overlay },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    ...shadows.float,
  },
  header: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingBottom: spacing.sm },
  subtitle: { marginTop: 2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.xs },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
