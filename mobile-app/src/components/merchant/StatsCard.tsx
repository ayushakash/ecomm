import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SIZES } from '../../theme';
import Card from '../ui/Card';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  onPress?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color = THEME.primary,
  subtitle,
  onPress,
}) => {
  return (
    <Card onPress={onPress} style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.value, { color }]}>{value}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: SIZES.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: SIZES.xs,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textMuted,
  },
});

export default StatsCard;