import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheet,
  Button,
  Card,
  Divider,
  Icon,
  Input,
  Screen,
  ScreenHeader,
  Text,
  type IconName,
} from '../../components/ui';
import { WEBSITE_URL } from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import type { MainTabScreenProps } from '../../navigation/types';
import { colors, radii, shadows, spacing, SCREEN_PADDING } from '../../theme';
import { callPhone, openExternal } from '../../utils/whatsapp';
import { isNotificationsAvailable, sendTestNotification, type TestNotificationKind } from '../../services/notifications';
import { currentLanguage, LANGUAGES, setLanguage } from '../../i18n';
import { DeleteAccountSheet } from './components/DeleteAccountSheet';
import { VerifyChangeSheet } from './components/VerifyChangeSheet';

/** Contact details from web pages/Contact.js. */
const CONTACT_PHONE = '916201176610';
const CONTACT_PHONE_LABEL = '+91 6201176610';
const OFFICE_ADDRESS = 'Kadru, AG Colony, Jharkhand 834002, India';
const OFFICE_MAP_URL = 'https://www.google.com/maps?q=23.35708709274134,85.31314123434679';

interface MenuItem {
  icon: IconName;
  label: string;
  subtitle?: string;
  onPress(): void;
  danger?: boolean;
}

function MenuGroup({ items }: { items: MenuItem[] }) {
  return (
    <Card padding={0} style={styles.group}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <Divider inset={56} />}
          <Pressable
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={[styles.rowIcon, item.danger && styles.rowIconDanger]}>
              <Icon name={item.icon} size={19} color={item.danger ? 'danger' : 'primary'} />
            </View>
            <View style={styles.flex}>
              <Text variant="title" weight="semibold" color={item.danger ? 'danger' : 'text'}>
                {item.label}
              </Text>
              {item.subtitle ? (
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
            {!item.danger && <Icon name="chevron-forward" size={18} color="textMuted" />}
          </Pressable>
        </React.Fragment>
      ))}
    </Card>
  );
}

export default function AccountScreen({ navigation }: MainTabScreenProps<'AccountTab'>) {
  const insets = useSafeAreaInsets();
  const {
    user,
    isAuthenticated,
    updateProfile,
    sendLinkPhoneOtp,
    linkPhone,
    sendChangeEmailOtp,
    verifyChangeEmail,
    logout,
  } = useAuth();

  const [nameSheet, setNameSheet] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [verifyKind, setVerifyKind] = useState<'phone' | 'email' | null>(null);
  const [contactSheet, setContactSheet] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [notifSheet, setNotifSheet] = useState(false);
  const [languageSheet, setLanguageSheet] = useState(false);
  const { t } = useTranslation('account');
  const language = currentLanguage();

  const testNotification = async (kind: TestNotificationKind) => {
    try {
      await sendTestNotification(kind);
      setNotifSheet(false);
      Alert.alert('Notification coming in 3 seconds', 'Lock the phone or go to the home screen to see it as a real notification.');
    } catch (e) {
      Alert.alert('Could not send test notification', e instanceof Error ? e.message : String(e));
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  const openNameSheet = () => {
    setName(user?.name ?? '');
    setNameSheet(true);
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed === user?.name) {
      setNameSheet(false);
      return;
    }
    setSavingName(true);
    const res = await updateProfile({ name: trimmed });
    setSavingName(false);
    if (res.success) setNameSheet(false);
  };

  const confirmLogout = () =>
    Alert.alert(t('logout.title'), t('logout.message'), [
      { text: t('logout.cancel'), style: 'cancel' },
      { text: t('logout.confirm'), style: 'destructive', onPress: () => void logout() },
    ]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '?';

  const shopItems: MenuItem[] = [
    ...(isAuthenticated
      ? [
          {
            icon: 'receipt-outline' as IconName,
            label: t('menu.orders'),
            subtitle: t('menu.ordersSub'),
            onPress: () => navigation.navigate('MainTabs', { screen: 'OrdersTab' }),
          },
          {
            icon: 'location-outline' as IconName,
            label: t('menu.addresses'),
            subtitle: t('menu.addressesSub'),
            onPress: () => navigation.navigate('Addresses', {}),
          },
        ]
      : []),
    {
      icon: 'calculator-outline',
      label: t('menu.calculator'),
      subtitle: t('menu.calculatorSub'),
      onPress: () => navigation.navigate('Calculator'),
    },
  ];

  const helpItems: MenuItem[] = [
    {
      icon: 'language-outline',
      label: t('common:language.label'),
      subtitle: LANGUAGES.find((l) => l.code === language)?.label,
      onPress: () => setLanguageSheet(true),
    },
    { icon: 'headset-outline', label: t('menu.contact'), subtitle: CONTACT_PHONE_LABEL, onPress: () => setContactSheet(true) },
    { icon: 'information-circle-outline', label: t('menu.about'), subtitle: 'chardeevari.in', onPress: () => openExternal(WEBSITE_URL) },
    { icon: 'newspaper-outline', label: t('menu.blog'), onPress: () => openExternal(`${WEBSITE_URL}/blog`) },
  ];
  // Dev-only: preview push notification styles before server push is built.
  if (__DEV__) {
    helpItems.push({
      icon: 'notifications-outline',
      label: 'Test notifications',
      subtitle: isNotificationsAvailable ? 'Preview offer / order alerts' : 'Needs a new app build',
      onPress: () => setNotifSheet(true),
    });
  }

  return (
    <Screen>
      <ScreenHeader title={t('title')} subtitle={t('subtitle')} back={false} icon="person-outline" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {isAuthenticated && user ? (
          <Card style={styles.profile} elevated>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <Text variant="h2" weight="bold" color="textInverse">
                  {initials}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text variant="h3" weight="bold" numberOfLines={1}>
                  {user.name || '—'}
                </Text>
                {user.phone ? (
                  <Text variant="bodySm" color="textSecondary">
                    +91 {user.phone}
                  </Text>
                ) : null}
                {user.email ? (
                  <Text variant="bodySm" color="textSecondary" numberOfLines={1}>
                    {user.email}
                  </Text>
                ) : null}
              </View>
              <Button title={t('profile.edit')} variant="outline" size="sm" leftIcon="pencil" onPress={openNameSheet} />
            </View>
            <Divider style={styles.profileDivider} />
            <Pressable
              style={styles.detailRow}
              onPress={() => setVerifyKind('phone')}
              accessibilityRole="button"
              accessibilityLabel={user.phone ? t('profile.changePhone') : t('profile.linkPhoneA11y')}
            >
              <Icon name="call-outline" size={18} color="textSecondary" />
              <Text variant="body" color={user.phone ? 'text' : 'textMuted'} style={styles.flex}>
                {user.phone ? `+91 ${user.phone}` : t('profile.noPhone')}
              </Text>
              <Text variant="label" weight="semibold" color="secondaryDark">
                {user.phone ? t('profile.change') : t('profile.linkPhone')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.detailRow}
              onPress={() => setVerifyKind('email')}
              accessibilityRole="button"
              accessibilityLabel={user.email ? t('profile.changeEmail') : t('profile.addEmail')}
            >
              <Icon name="mail-outline" size={18} color="textSecondary" />
              <Text variant="body" color={user.email ? 'text' : 'textMuted'} style={styles.flex} numberOfLines={1}>
                {user.email || t('profile.noEmail')}
              </Text>
              <Text variant="label" weight="semibold" color="secondaryDark">
                {user.email ? t('profile.change') : t('profile.add')}
              </Text>
            </Pressable>
          </Card>
        ) : (
          <Card style={styles.guest} elevated>
            <View style={styles.guestIcon}>
              <Icon name="person" size={28} color="primary" />
            </View>
            <Text variant="h2" weight="bold" align="center">
              {t('guest.title')}
            </Text>
            <Text variant="bodySm" color="textSecondary" align="center">
              {t('guest.message')}
            </Text>
            <Button
              title={t('guest.login')}
              variant="secondary"
              fullWidth
              onPress={() => navigation.navigate('Login', { redirect: { name: 'MainTabs', params: { screen: 'AccountTab' } } })}
            />
          </Card>
        )}

        <MenuGroup items={shopItems} />
        <MenuGroup items={helpItems} />
        {isAuthenticated && (
          <MenuGroup
            items={[
              { icon: 'log-out-outline', label: t('logout.confirm'), onPress: confirmLogout, danger: true },
              { icon: 'trash-outline', label: t('menu.deleteAccount'), onPress: () => setDeleteSheet(true), danger: true },
            ]}
          />
        )}

        <Text variant="caption" color="textMuted" align="center">
          {t('version', { version })}
        </Text>
      </ScrollView>

      <BottomSheet
        visible={nameSheet}
        onClose={() => setNameSheet(false)}
        title={t('profile.editName')}
        footer={<Button title={t('profile.save')} fullWidth loading={savingName} disabled={name.trim().length < 2} onPress={saveName} />}
      >
        <Input label={t('profile.fullName')} value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
      </BottomSheet>

      <VerifyChangeSheet
        kind={verifyKind}
        onClose={() => setVerifyKind(null)}
        sendOtp={verifyKind === 'phone' ? sendLinkPhoneOtp : sendChangeEmailOtp}
        verify={verifyKind === 'phone' ? linkPhone : verifyChangeEmail}
      />

      <DeleteAccountSheet visible={deleteSheet} onClose={() => setDeleteSheet(false)} />

      <BottomSheet visible={languageSheet} onClose={() => setLanguageSheet(false)} title={t('common:language.title')}>
        <View style={styles.contactList}>
          {LANGUAGES.map((l) => (
            <Button
              key={l.code}
              title={l.label}
              variant={l.code === language ? 'primary' : 'outline'}
              rightIcon={l.code === language ? 'checkmark' : undefined}
              fullWidth
              onPress={() => {
                void setLanguage(l.code);
                setLanguageSheet(false);
              }}
            />
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={notifSheet} onClose={() => setNotifSheet(false)} title="Test notifications" subtitle="Arrives 3 seconds after tapping">
        <View style={styles.contactList}>
          <Button title="Offer / deal" leftIcon="pricetag-outline" fullWidth onPress={() => void testNotification('offer')} />
          <Button title="Order update" variant="outline" leftIcon="bus-outline" fullWidth onPress={() => void testNotification('order')} />
          <Button title="Cart reminder" variant="outline" leftIcon="cart-outline" fullWidth onPress={() => void testNotification('cart')} />
        </View>
      </BottomSheet>

      <BottomSheet visible={contactSheet} onClose={() => setContactSheet(false)} title={t('menu.contact')} subtitle={t('contact.subtitle')}>
        <View style={styles.contactList}>
          <Button title={t('contact.call', { phone: CONTACT_PHONE_LABEL })} variant="primary" leftIcon="call" fullWidth onPress={() => callPhone(CONTACT_PHONE)} />
          <Button
            title={t('contact.whatsapp')}
            variant="whatsapp"
            leftIcon="logo-whatsapp"
            fullWidth
            onPress={() => openExternal(`https://wa.me/${CONTACT_PHONE}`, t('contact.whatsappError'))}
          />
          <Text variant="caption" color="textMuted" align="center">
            {t('contact.hours')}
          </Text>
          <Divider />
          <Pressable style={styles.detailRow} onPress={() => openExternal(OFFICE_MAP_URL)} accessibilityRole="link" accessibilityLabel={t('contact.directionsA11y')}>
            <Icon name="business-outline" size={20} color="textSecondary" />
            <View style={styles.flex}>
              <Text variant="title" weight="semibold">
                {t('contact.headOffice')}
              </Text>
              <Text variant="bodySm" color="textSecondary">
                {OFFICE_ADDRESS}
              </Text>
            </View>
            <Text variant="label" weight="semibold" color="secondaryDark">
              {t('contact.directions')}
            </Text>
          </Pressable>
          <Button title={t('contact.openPage')} variant="ghost" rightIcon="open-outline" fullWidth onPress={() => openExternal(`${WEBSITE_URL}/contact`)} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SCREEN_PADDING, gap: spacing.lg },
  profile: { gap: spacing.xs },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileDivider: { marginVertical: spacing.sm },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  guest: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  guestIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56 },
  rowPressed: { backgroundColor: colors.surfaceMuted },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: colors.dangerSoft },
  contactList: { gap: spacing.md },
});
