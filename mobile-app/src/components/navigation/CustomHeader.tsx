import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { THEME, SIZES, SHADOWS } from '../../theme';

interface CustomHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showCart?: boolean;
  showProfile?: boolean;
  showSearch?: boolean;
  onBackPress?: () => void;
  onCartPress?: () => void;
  onProfilePress?: () => void;
  onSearchPress?: () => void;
  onHomePress?: () => void;
  rightComponent?: React.ReactNode;
  transparent?: boolean;
  elevation?: boolean;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title = 'ECommerce',
  subtitle,
  showBack = false,
  showCart = true,
  showProfile = true,
  showSearch = false,
  onBackPress,
  onCartPress,
  onProfilePress,
  onSearchPress,
  onHomePress,
  rightComponent,
  transparent = false,
  elevation = true,
}) => {
  const { user } = useAuth();
  const { getTotalItems } = useCart();

  const cartItems = getTotalItems();

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={transparent ? 'transparent' : THEME.primary}
        translucent={transparent}
      />
      <SafeAreaView 
        style={[
          styles.safeArea, 
          { backgroundColor: transparent ? 'transparent' : THEME.primary }
        ]} 
        edges={['top']}
      >
        <View style={[
          styles.header,
          transparent && styles.transparentHeader,
          elevation && styles.headerElevation,
        ]}>
          {/* Left Section */}
          <View style={styles.leftSection}>
            {showBack ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBackPress}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color={THEME.background} />
              </TouchableOpacity>
            ) : onHomePress ? (
              <TouchableOpacity
                style={styles.brandContainer}
                onPress={onHomePress}
                activeOpacity={0.7}
              >
                <View style={styles.brandIcon}>
                  <Ionicons name="home" size={20} color={THEME.background} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.brandContainer}>
                <View style={styles.brandIcon}>
                  <Ionicons name="storefront" size={20} color={THEME.background} />
                </View>
              </View>
            )}
          </View>

          {/* Center Section */}
          <View style={styles.centerSection}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>

          {/* Right Section */}
          <View style={styles.rightSection}>
            {rightComponent ? (
              rightComponent
            ) : (
              <>
                {showSearch && (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={onSearchPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="search" size={24} color={THEME.background} />
                  </TouchableOpacity>
                )}

                {showCart && (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={onCartPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="cart-outline" size={24} color={THEME.background} />
                    {cartItems > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {cartItems > 99 ? '99+' : cartItems.toString()}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {showProfile && (
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={onProfilePress}
                    activeOpacity={0.7}
                  >
                    {user?.avatar ? (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                    ) : (
                      <Ionicons name="person-outline" size={24} color={THEME.background} />
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: THEME.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: THEME.primary,
    minHeight: 60,
  },
  transparentHeader: {
    backgroundColor: 'transparent',
  },
  headerElevation: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.background + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.background,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.background + 'CC',
    marginTop: 2,
    textAlign: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.xs,
    position: 'relative',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: THEME.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  badgeText: {
    color: THEME.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.background + '40',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.background + '60',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.background,
  },
});

export default CustomHeader;