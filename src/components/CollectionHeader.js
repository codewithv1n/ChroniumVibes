
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, placeholderColors } from '../styles/theme';
import IconButton from './IconButton';

export default function CollectionHeader({
  artwork, 
  title,
  subtitle,
  meta,
  seed,
  onPlay,
  onShuffle,
  actions = [], 
  disabled,
}) {
  const { width } = useWindowDimensions();
  const [tint] = placeholderColors(seed || title);

  return (
    <View>
      <LinearGradient
        colors={[`${tint}55`, COLORS.bgDeep]}
        style={[StyleSheet.absoluteFill, { height: Math.min(width, 420) }]}
        pointerEvents="none"
      />
      <View style={styles.artwork}>{artwork}</View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}

        <View style={styles.actionRow}>
          {actions.map(action => (
            <IconButton
              key={action.label}
              icon={action.icon}
              size={24}
              color={action.active ? COLORS.accentLight : COLORS.textSecondary}
              onPress={action.onPress}
              label={action.label}
            />
          ))}
          <View style={styles.spacer} />
          {onShuffle ? (
            <IconButton icon="shuffle" size={26} color={COLORS.textSecondary} onPress={onShuffle} label="Shuffle play" disabled={disabled} />
          ) : null}
          {onPlay ? (
            <Pressable
              onPress={onPlay}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Play ${title}`}
              style={({ pressed }) => [styles.playButton, pressed && styles.pressed, disabled && styles.disabled]}
            >
              <Ionicons name="play" size={26} color={COLORS.white} style={styles.playIcon} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    shadowColor: COLORS.black,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  body: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.display,
    fontSize: 24,
  },
  subtitle: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textPrimary,
    marginTop: 6,
  },
  meta: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginLeft: -10,
  },
  spacer: {
    flex: 1,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  playIcon: {
    marginLeft: 3,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  disabled: {
    opacity: 0.35,
  },
});

