import React from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SIZES } from '../../theme';

const { width } = Dimensions.get('window');

export const CustomToastConfig = {
  success: ({ text1, text2, ...props }: any) => (
    <Animated.View style={[styles.toastContainer, styles.successToast]} {...props}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconBackground, styles.successIconBg]}>
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, styles.successTitle]}>{text1}</Text>
        {text2 && <Text style={[styles.toastMessage, styles.successMessage]}>{text2}</Text>}
      </View>
      <View style={[styles.progressBar, styles.successProgress]} />
    </Animated.View>
  ),

  error: ({ text1, text2, ...props }: any) => (
    <Animated.View style={[styles.toastContainer, styles.errorToast]} {...props}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconBackground, styles.errorIconBg]}>
          <Ionicons name="close-circle" size={24} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, styles.errorTitle]}>{text1}</Text>
        {text2 && <Text style={[styles.toastMessage, styles.errorMessage]}>{text2}</Text>}
      </View>
      <View style={[styles.progressBar, styles.errorProgress]} />
    </Animated.View>
  ),

  info: ({ text1, text2, ...props }: any) => (
    <Animated.View style={[styles.toastContainer, styles.infoToast]} {...props}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconBackground, styles.infoIconBg]}>
          <Ionicons name="information-circle" size={24} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, styles.infoTitle]}>{text1}</Text>
        {text2 && <Text style={[styles.toastMessage, styles.infoMessage]}>{text2}</Text>}
      </View>
      <View style={[styles.progressBar, styles.infoProgress]} />
    </Animated.View>
  ),

  warning: ({ text1, text2, ...props }: any) => (
    <Animated.View style={[styles.toastContainer, styles.warningToast]} {...props}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconBackground, styles.warningIconBg]}>
          <Ionicons name="warning" size={24} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.toastTitle, styles.warningTitle]}>{text1}</Text>
        {text2 && <Text style={[styles.toastMessage, styles.warningMessage]}>{text2}</Text>}
      </View>
      <View style={[styles.progressBar, styles.warningProgress]} />
    </Animated.View>
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width - 32,
    marginHorizontal: 16,
    marginTop: 60,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },

  // Success Toast
  successToast: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  successIconBg: {
    backgroundColor: '#10B981',
  },
  successTitle: {
    color: '#10B981',
  },
  successMessage: {
    color: '#6B7280',
  },
  successProgress: {
    backgroundColor: '#10B981',
  },

  // Error Toast
  errorToast: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorIconBg: {
    backgroundColor: '#EF4444',
  },
  errorTitle: {
    color: '#EF4444',
  },
  errorMessage: {
    color: '#6B7280',
  },
  errorProgress: {
    backgroundColor: '#EF4444',
  },

  // Info Toast
  infoToast: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoIconBg: {
    backgroundColor: '#3B82F6',
  },
  infoTitle: {
    color: '#3B82F6',
  },
  infoMessage: {
    color: '#6B7280',
  },
  infoProgress: {
    backgroundColor: '#3B82F6',
  },

  // Warning Toast
  warningToast: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningIconBg: {
    backgroundColor: '#F59E0B',
  },
  warningTitle: {
    color: '#F59E0B',
  },
  warningMessage: {
    color: '#6B7280',
  },
  warningProgress: {
    backgroundColor: '#F59E0B',
  },

  iconContainer: {
    marginRight: 12,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    width: '100%',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
});

export default CustomToastConfig;