import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { applyStoredLanguage } from '../i18n';

/** Set by index.js when the page booted from prerendered (react-snap) data. */
export const prerenderBoot = { hadQueries: false };

/**
 * Runs once the prerendered page content has hydrated: refresh the build-time
 * data (prices may have changed since the snapshot) and switch to the visitor's
 * saved language. Rendered as the last child inside Layout's page <Suspense>, so
 * its effect fires only after that boundary has hydrated — an update before that
 * would make React discard the static HTML and re-render the page.
 */
const AfterHydration = () => {
  const client = useQueryClient();
  useEffect(() => {
    if (prerenderBoot.hadQueries) client.invalidateQueries();
    prerenderBoot.hadQueries = false;
    applyStoredLanguage();
  }, [client]);
  return null;
};

export default AfterHydration;
