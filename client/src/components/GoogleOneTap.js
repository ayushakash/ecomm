import { useGoogleOneTapLogin } from '@react-oauth/google';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Global Google One Tap.
 *
 * For logged-out users, Google shows a prompt with their Google account(s).
 * On mobile web this renders as a bottom-sheet "tray" (exactly the UX we want);
 * on desktop it appears top-right. Mounted once at the app root.
 *
 * We disable it when:
 *  - auth is still loading (avoid prompting before we know the login state),
 *  - the user is already logged in,
 *  - we're on a dedicated auth page (Login/Register already have a button).
 */
const AUTH_ROUTES = ['/login', '/register', '/merchant-register'];

const GoogleOneTap = () => {
  const { user, loading, loginWithGoogle } = useAuth();
  const { pathname } = useLocation();

  const onAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const disabled = loading || !!user || onAuthRoute;

  useGoogleOneTapLogin({
    disabled,
    cancel_on_tap_outside: false, // keep the tray until the user acts
    use_fedcm_for_prompt: true,   // required by current Chrome for One Tap
    onSuccess: (credentialResponse) => {
      if (credentialResponse?.credential) {
        loginWithGoogle(credentialResponse.credential);
      }
    },
    onError: () => {
      // User dismissed the prompt or FedCM declined — fail silently.
    },
  });

  return null;
};

export default GoogleOneTap;
