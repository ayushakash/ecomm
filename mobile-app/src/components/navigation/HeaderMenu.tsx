import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, SIZES } from '../../theme';

interface HeaderMenuProps {
  visible: boolean;
  onClose: () => void;
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({ visible, onClose }) => {
  const { width } = useWindowDimensions();
  const [slideAnim] = React.useState(new Animated.Value(width));

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : width,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [visible, slideAnim, width]);

  const handleAbout = async () => {
    onClose();
    // Navigate to About screen or show modal
    try {
      await Linking.openURL('https://yourapp.com/about');
    } catch (error) {
      console.log('Navigate to About screen here');
    }
  };

  const handleContact = async () => {
    onClose();
    // Navigate to Contact screen or show contact info
    try {
      await Linking.openURL('https://yourapp.com/contact');
    } catch (error) {
      console.log('Navigate to Contact screen here');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Menu Container */}
        <Animated.View
          style={[
            styles.menuContainer,
            {
              transform: [{ translateX: slideAnim }],
              width: Math.min(width * 0.75, 320),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>More</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={THEME.text} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContent}>
            {/* About */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleAbout}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="information-circle-outline" size={24} color={THEME.primary} />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.menuItemTitle}>About Us</Text>
                  <Text style={styles.menuItemSubtitle}>Learn more about our platform</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Contact */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleContact}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="mail-outline" size={24} color={THEME.primary} />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.menuItemTitle}>Contact Us</Text>
                  <Text style={styles.menuItemSubtitle}>Get in touch with our team</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.menuFooter}>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    backgroundColor: THEME.surface,
    height: '100%',
    paddingTop: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.primary,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.background,
  },
  closeButton: {
    padding: SIZES.sm,
    borderRadius: SIZES.md,
    backgroundColor: THEME.background + '10',
  },
  menuContent: {
    flex: 1,
    paddingVertical: SIZES.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  itemTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: SIZES.sm,
    marginHorizontal: SIZES.lg,
  },
  menuFooter: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: THEME.textMuted,
  },
});

export default HeaderMenu;
