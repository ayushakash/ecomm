import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { THEME, SIZES } from '../../theme';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import CustomHeader from '../../components/navigation/CustomHeader';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Implement profile refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await updateProfile(editData);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout
        },
      ]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Support',
      'How would you like to contact support?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => Linking.openURL('tel:+919876543210')
        },
        { 
          text: 'Email', 
          onPress: () => Linking.openURL('mailto:support@ecommerce.com')
        },
      ]
    );
  };

  const renderProfileHeader = () => (
    <Card style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        {!isEditing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="pencil" size={16} color={THEME.background} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userRole}>Customer</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.userPhone}>{user?.phoneNumber}</Text>
      </View>
    </Card>
  );

  const renderEditForm = () => (
    <Card style={styles.editForm}>
      <Text style={styles.cardTitle}>Edit Profile</Text>
      
      <Input
        label="Full Name"
        value={editData.name}
        onChangeText={(text) => setEditData({ ...editData, name: text })}
        placeholder="Enter your full name"
        leftIcon="person-outline"
      />
      
      <Input
        label="Email Address"
        value={editData.email}
        onChangeText={(text) => setEditData({ ...editData, email: text })}
        placeholder="Enter your email"
        leftIcon="mail-outline"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <Input
        label="Phone Number"
        value={editData.phoneNumber}
        onChangeText={(text) => setEditData({ ...editData, phoneNumber: text })}
        placeholder="Enter your phone number"
        leftIcon="call-outline"
        keyboardType="phone-pad"
      />

      <View style={styles.formActions}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={handleCancelEdit}
          style={styles.formButton}
        />
        <Button
          title="Save"
          onPress={handleSaveProfile}
          loading={isLoading}
          style={styles.formButton}
        />
      </View>
    </Card>
  );

  const renderAccountSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account</Text>
      
      <Card style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Orders')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="receipt-outline" size={24} color={THEME.primary} />
            <Text style={styles.menuItemText}>My Orders</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Cart')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="cart-outline" size={24} color={THEME.primary} />
            <Text style={styles.menuItemText}>My Cart</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('AddressManagement', { returnTo: 'Profile' })}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="location-outline" size={24} color={THEME.primary} />
            <Text style={styles.menuItemText}>Saved Addresses</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
        </TouchableOpacity>
      </Card>
    </View>
  );

  const renderPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>
      
      <Card style={styles.menuCard}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => {
            // TODO: Implement notifications settings
            Alert.alert('Coming Soon', 'Notification settings feature is coming soon!');
          }}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={24} color={THEME.primary} />
            <Text style={styles.menuItemText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => {
            // TODO: Implement language settings
            Alert.alert('Coming Soon', 'Language settings feature is coming soon!');
          }}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="language-outline" size={24} color={THEME.primary} />
            <Text style={styles.menuItemText}>Language</Text>
          </View>
          <View style={styles.menuItemRight}>
            <Text style={styles.menuItemSubtext}>English</Text>
            <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
          </View>
        </TouchableOpacity>
      </Card>
    </View>
  );

  const renderSupportSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Support</Text>
      
      <Card style={styles.menuCard}>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleSupport}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="help-circle-outline" size={24} color={THEME.primary} />
            <Text style={styles.menuItemText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => {
            // TODO: Implement feedback
            Alert.alert('Coming Soon', 'Feedback feature is coming soon!');
          }}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="chatbubble-outline" size={24} color={THEME.primary} />
            <Text style={styles.menuItemText}>Send Feedback</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => {
            // TODO: Implement about page
            Alert.alert('About', 'E-commerce App v1.0.0\nBuilt with React Native & Expo');
          }}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="information-circle-outline" size={24} color={THEME.primary} />
            <Text style={styles.menuItemText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
        </TouchableOpacity>
      </Card>
    </View>
  );

  const renderLogoutButton = () => (
    <View style={styles.logoutContainer}>
      <Button
        title="Logout"
        variant="outline"
        onPress={handleLogout}
        style={styles.logoutButton}
        textStyle={styles.logoutText}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader
        title={isEditing ? "Edit Profile" : "My Profile"}
        subtitle={isEditing ? "Update your information" : user?.email}
        showBack={true}
        showCart={!isEditing}
        showProfile={false}
        onBackPress={() => navigation.goBack()}
        onCartPress={() => navigation.navigate('Cart')}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: Math.max(insets.bottom, SIZES.sm) + SIZES.tabBarHeight + SIZES.xl }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderProfileHeader()}
        {isEditing && renderEditForm()}
        {!isEditing && renderAccountSection()}
        {!isEditing && renderPreferencesSection()}
        {!isEditing && renderSupportSection()}
        {!isEditing && renderLogoutButton()}
      </ScrollView>
    </View>
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
  scrollViewContent: {
    flexGrow: 1,
  },
  profileHeader: {
    margin: SIZES.lg,
    padding: SIZES.xl,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SIZES.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: THEME.background,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: THEME.background,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.xs,
  },
  userRole: {
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
    marginBottom: SIZES.sm,
  },
  userEmail: {
    fontSize: 16,
    color: THEME.textSecondary,
    marginBottom: SIZES.xs,
  },
  userPhone: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  editForm: {
    margin: SIZES.lg,
    padding: SIZES.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.lg,
    gap: SIZES.md,
  },
  formButton: {
    flex: 1,
  },
  section: {
    marginBottom: SIZES.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.lg,
  },
  menuCard: {
    marginHorizontal: SIZES.lg,
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: THEME.text,
    marginLeft: SIZES.md,
    flex: 1,
  },
  menuItemSubtext: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginRight: SIZES.sm,
  },
  menuDivider: {
    height: 1,
    backgroundColor: THEME.borderLight,
    marginLeft: SIZES.lg + 24 + SIZES.md,
  },
  logoutContainer: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  logoutButton: {
    borderColor: THEME.error,
  },
  logoutText: {
    color: THEME.error,
  },
});

export default ProfileScreen;