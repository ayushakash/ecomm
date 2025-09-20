import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { THEME, SIZES } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: number;
  padding?: number;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevation = 2,
  padding = SIZES.md,
}) => {
  const cardStyles = [
    styles.card,
    { 
      padding,
      shadowOpacity: elevation * 0.05,
      shadowRadius: elevation * 2,
      elevation,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyles} onPress={onPress} activeOpacity={0.9}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surface,
    borderRadius: SIZES.md,
    shadowColor: THEME.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginVertical: SIZES.xs,
  },
});

export default Card;