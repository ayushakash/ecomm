import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { THEME, SIZES } from '../../theme';

const GuestProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  const handleRegisterPress = () => {
    navigation.navigate('Register');
  };

  const handleGuestFeaturePress = (featureName: string) => {
    Alert.alert(
      'Login Required',
      `Please login to access ${featureName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: handleLoginPress },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>👷</Text>
          </View>
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.subtitleText}>Please sign in to continue</Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.authSection}>
          <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegisterPress}>
            <Text style={styles.registerButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: THEME.textMuted,
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SIZES.xl * 2,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.text,
    marginTop: SIZES.lg,
    marginBottom: SIZES.xs,
  },
  subtitleText: {
    fontSize: 16,
    color: THEME.textMuted,
    textAlign: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: THEME.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarEmoji: {
    fontSize: 60,
  },
  authSection: {
    marginTop: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  loginButton: {
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.md,
    marginBottom: SIZES.md,
  },
  loginButtonText: {
    color: THEME.background,
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.md,
  },
  registerButtonText: {
    color: THEME.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  featuresSection: {
    marginBottom: SIZES.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  featureIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.textMuted,
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 14,
    color: THEME.textMuted,
  },
  helpSection: {
    marginTop: 'auto',
    paddingBottom: SIZES.xl,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  helpText: {
    fontSize: 16,
    color: THEME.primary,
    marginLeft: SIZES.sm,
  },
});

export default GuestProfileScreen;