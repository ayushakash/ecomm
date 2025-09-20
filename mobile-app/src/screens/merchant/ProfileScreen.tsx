import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Navigation will be handled automatically by AuthContext
          },
        },
      ]
    );
  };

  const profileSections = [
    {
      title: 'Personal Information',
      items: [
        { label: 'Name', value: user?.name || 'N/A', icon: 'person-outline' },
        { label: 'Email', value: user?.email || 'N/A', icon: 'mail-outline' },
        { label: 'Phone', value: user?.phoneNumber || 'N/A', icon: 'call-outline' },
        { label: 'Role', value: 'Merchant', icon: 'storefront-outline' },
      ]
    },
    {
      title: 'Business Information',
      items: [
        { label: 'Business Name', value: user?.businessName || 'N/A', icon: 'business-outline' },
        { label: 'Area', value: user?.area || 'N/A', icon: 'location-outline' },
        { label: 'Status', value: user?.isActive ? 'Active' : 'Inactive', icon: 'checkmark-circle-outline' },
        { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A', icon: 'calendar-outline' },
      ]
    }
  ];

  const actionItems = [
    {
      title: 'My Products',
      icon: 'cube-outline',
      onPress: () => navigation.navigate('MerchantProducts'),
    },
    {
      title: 'My Orders',
      icon: 'receipt-outline',
      onPress: () => navigation.navigate('Orders'),
    },
    {
      title: 'Analytics',
      icon: 'analytics-outline',
      onPress: () => navigation.navigate('MerchantAnalytics'),
    },
    {
      title: 'Settings',
      icon: 'settings-outline',
      onPress: () => {
        // Navigate to settings or show toast for now
        Alert.alert('Settings', 'Settings page coming soon!');
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={THEME.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'M'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Merchant'}</Text>
          {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
        </View>

        {/* Profile Information Sections */}
        {profileSections.map((section, index) => (
          <Card key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name={item.icon as any} size={20} color={THEME.textMuted} />
                  <Text style={styles.infoLabel}>{item.label}</Text>
                </View>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </Card>
        ))}

        {/* Quick Actions */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {actionItems.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionItem}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <Ionicons name={action.icon as any} size={20} color={THEME.primary} />
                <Text style={styles.actionTitle}>{action.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Logout Button */}
        <Card style={styles.section}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutButton}
            icon={<Ionicons name="log-out-outline" size={20} color={THEME.error} />}
            textStyle={{ color: THEME.error }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SIZES.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backButton: {
    padding: SIZES.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  headerRight: {
    width: 40, // Same as back button for centering
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME.background,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  userEmail: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  section: {
    marginHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    color: THEME.text,
    marginLeft: SIZES.md,
  },
  infoValue: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'right',
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    color: THEME.text,
    marginLeft: SIZES.md,
  },
  logoutButton: {
    borderColor: THEME.error,
  },
});

export default ProfileScreen;