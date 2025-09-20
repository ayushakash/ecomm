import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SIZES } from '../../theme';

interface CustomLoaderProps {
  visible: boolean;
  message?: string;
}

const loaderTypes = [
  {
    icon: 'cube-outline',
    name: 'cement bag',
    color: '#8B7355',
    message: 'Loading cement bags...'
  },
  {
    icon: 'git-commit-outline',
    name: 'steel rod',
    color: '#708090',
    message: 'Arranging steel rods...'
  },
  {
    icon: 'hammer-outline',
    name: 'tools',
    color: '#CD853F',
    message: 'Preparing tools...'
  },
  {
    icon: 'construct-outline',
    name: 'equipment',
    color: '#FF6347',
    message: 'Setting up equipment...'
  },
  {
    icon: 'business-outline',
    name: 'materials',
    color: '#4682B4',
    message: 'Organizing materials...'
  }
];

const CustomLoader: React.FC<CustomLoaderProps> = ({ visible, message }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const randomLoader = loaderTypes[Math.floor(Math.random() * loaderTypes.length)];

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(1);

      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      const scaleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      rotateAnimation.start();
      scaleAnimation.start();

      return () => {
        rotateAnimation.stop();
        scaleAnimation.stop();
      };
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.loaderContent}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                { rotate },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <Ionicons
            name={randomLoader.icon as any}
            size={48}
            color={randomLoader.color}
          />
        </Animated.View>

        <Text style={styles.loadingText}>
          {message || randomLoader.message}
        </Text>

        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: rotateAnim.interpolate({
                    inputRange: [0, 0.33, 0.66, 1],
                    outputRange: index === 0 ? [1, 0.3, 0.3, 1] :
                               index === 1 ? [0.3, 1, 0.3, 0.3] :
                               [0.3, 0.3, 1, 0.3],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderContent: {
    alignItems: 'center',
    padding: SIZES.xl,
    backgroundColor: THEME.background,
    borderRadius: SIZES.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: SIZES.lg,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: SIZES.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
});

export default CustomLoader;