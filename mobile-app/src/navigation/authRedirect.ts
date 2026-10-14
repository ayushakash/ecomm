import type { LoginRedirect, RootNavigation } from './types';

/**
 * Call from LoginScreen after a successful login: replaces the Login modal
 * with the redirect target, or just closes it.
 */
export function completeLogin(navigation: RootNavigation, redirect?: LoginRedirect): void {
  if (!redirect) {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('MainTabs');
    return;
  }
  switch (redirect.name) {
    case 'Checkout':
      navigation.replace('Checkout');
      break;
    case 'Addresses':
      navigation.replace('Addresses', redirect.params);
      break;
    case 'OrderDetail':
      navigation.replace('OrderDetail', redirect.params);
      break;
    case 'MainTabs':
      navigation.goBack();
      if (redirect.params) navigation.navigate('MainTabs', redirect.params);
      break;
  }
}
