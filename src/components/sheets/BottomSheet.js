import { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, Animated, PanResponder, StyleSheet, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, themedStyles } from '../../styles/theme';
import { closeSheet } from '../../navigation/navigation';


function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, e => setHeight(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}


function useSwipeToClose(onClose) {
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 1) onCloseRef.current();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start(),
    })
  ).current;

  return { translateY, panHandlers: pan.panHandlers };
}

export default function BottomSheet({ children, title, onClose = closeSheet, maxHeight = 0.85 }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const { translateY, panHandlers } = useSwipeToClose(onClose);
  const bottomSpace = keyboardHeight > 0 ? keyboardHeight : insets.bottom;
  const availableHeight = windowHeight - bottomSpace - insets.top - SPACING.md;
  const sheetMaxHeight = Math.min(windowHeight * maxHeight, availableHeight);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button">
        <AnimatedPressable
          style={[
            styles.sheet,
            { maxHeight: sheetMaxHeight, marginBottom: keyboardHeight, paddingBottom: (keyboardHeight > 0 ? 0 : insets.bottom) + SPACING.md },
            { transform: [{ translateY }] },
          ]}
          onPress={() => {}}
        >
          <View style={styles.grip} {...panHandlers}>
            <View style={styles.handle} />
            {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
          </View>
          {children}
        </AnimatedPressable>
      </Pressable>
    </Modal>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SheetAction({ icon, label, onPress, active, destructive, right }) {
  const color = destructive ? COLORS.danger : active ? COLORS.accentLight : COLORS.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active !== undefined ? { selected: !!active } : undefined}
      android_ripple={{ color: COLORS.accentSoft }}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={destructive ? COLORS.danger : active ? COLORS.accentLight : COLORS.textSecondary} />
      <Text style={[styles.actionLabel, { color }]} numberOfLines={1}>{label}</Text>
      {right}
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  grip: {
    paddingTop: SPACING.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.section,
    fontSize: 17,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  action: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  pressed: {
    backgroundColor: COLORS.bgCardHover,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
}));
