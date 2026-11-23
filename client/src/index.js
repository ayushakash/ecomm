import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import './i18n';
import { prerenderBoot } from './components/AfterHydration';
import App, { preloadRoute } from './App';
import { getPrerenderLocationState } from './contexts/LocationContext';
import { addHydrationMarkers } from './utils/prerenderHydrationMarkers';

const isPrerender = navigator.userAgent === 'ReactSnap';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchInterval: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000 // 10 minutes
    },
  },
});

// react-snap saves the API data each page was rendered with (window.snapSaveState
// → inline script). Seeding the cache with it makes the first client render
// identical to the prerendered HTML, so hydration keeps the markup instead of
// throwing it away and re-rendering (the main source of layout shift).
const prerenderedQueries = window.__REACT_QUERY_STATE__;
delete window.__REACT_QUERY_STATE__;
if (prerenderedQueries) {
  hydrate(queryClient, prerenderedQueries);
  prerenderBoot.hadQueries = true; // refreshed by <AfterHydration /> (Layout)
}
if (isPrerender) {
  // react-snap calls this right before saving the page. Cross-origin scripts in
  // the DOM were injected at runtime (e.g. Google Identity Services by
  // GoogleOAuthProvider); the app re-injects them on load, so baking them into
  // the static HTML would only make them load earlier and block rendering.
  window.snapSaveState = () => {
    document.querySelectorAll('script[src]').forEach((script) => {
      if (new URL(script.src, window.location.href).origin !== window.location.origin) script.remove();
    });
    addHydrationMarkers(document.getElementById('root'));
    return {
      __REACT_QUERY_STATE__: dehydrate(queryClient),
      __LOCATION_STATE__: getPrerenderLocationState(),
    };
  };
}

const appTree = (
  <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
);

const rootElement = document.getElementById('root');
// react-snap prerenders static HTML into #root at build time. When that markup
// is present, hydrate it (so crawlers/users get real HTML instantly); otherwise
// render fresh on the client. The page's lazy chunk is loaded first: a route
// that suspends during hydration would swap the prerendered page for a spinner.
if (rootElement.hasChildNodes()) {
  preloadRoute(window.location.pathname)
    .catch(() => {})
    .then(() => ReactDOM.hydrateRoot(rootElement, appTree));
} else {
  ReactDOM.createRoot(rootElement).render(appTree);
}


// Skip SW during react-snap prerender — the service worker intercepts requests
// and conflicts with prerendering/hydration.
if ('serviceWorker' in navigator && !isPrerender) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((err) => {
        console.log('SW registration failed:', err);
      });
  });
}
