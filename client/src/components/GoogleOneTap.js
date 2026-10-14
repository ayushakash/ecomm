import { useEffect, useState } from 'react';
import { useGoogleOneTapLogin } from '@react-oauth/google';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Global Google One Tap.
 *
 * For logged-out users, Google shows a prompt with their Google account(s).
 * On mobile web this renders as a bottom-sheet "tray"; on desktop top-right.
 * Mounted once at the app root.
 *
 * ENGAGEMENT GATE (do not remove — see GA report Jun 2026):
 * First-time mobile visitors from ads were bouncing off this tray on landing,
 * mistaking it for a mandatory login/phone-number gate. One Tap converts well
 * for *engaged* visitors, terribly as a door greeter. So we prompt only after
 * the visitor has viewed a 2nd page in the current browser session — never on
 * the page they land on.
 *
 * We also disable it when:
 *  - auth is still loading (avoid prompting before we know the login state),
 *  - the user is already logged in,
 *  - we're on a dedicated auth page (Login/Register already have a button).
 */
const AUTH_ROUTES = ['/login', '/register', '/merchant-register'];

const PAGEVIEWS_BEFORE_PROMPT = 2; // landing page = 1; prompt from the 2nd page on
const PAGEVIEW_COUNT_KEY = 'oneTapPageviews'; // sessionStorage — resets each browser session

const GoogleOneTap = () => {
  const { user, loading, loginWithGoogle } = useAuth();
  const { pathname } = useLocation();
  const [engaged, setEngaged] = useState(false);

  // Count route views for this session; unlock One Tap from the 2nd view.
  useEffect(() => {
    const views = (parseInt(sessionStorage.getItem(PAGEVIEW_COUNT_KEY), 10) || 0) + 1;
    sessionStorage.setItem(PAGEVIEW_COUNT_KEY, String(views));
    if (views >= PAGEVIEWS_BEFORE_PROMPT) setEngaged(true);
  }, [pathname]);

  const onAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  // react-snap prerender has no Google script (third-party requests are blocked).
  const isPrerender = typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';
  const disabled = loading || !!user || onAuthRoute || isPrerender || !engaged;

  useGoogleOneTapLogin({
    disabled,
    // Let visitors dismiss by tapping outside — never trap them in the tray.
    // (Was `false`; that made the prompt feel like a mandatory login wall.)
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true, // required by current Chrome for One Tap
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
