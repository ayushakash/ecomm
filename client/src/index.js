import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';

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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
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

// ─── PERF LOGGER (remove when done) ───────────────────────────────────────
window.__perfStart = performance.now();

window.addEventListener('load', () => {
  setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');

    console.group('%c⚡ Page Load Breakdown', 'color:#0ea5e9;font-size:14px;font-weight:bold');

    console.log('%cNavigation Timing', 'color:#f59e0b;font-weight:bold');
    console.table({
      'TTFB (server response)':     { ms: Math.round(nav.responseStart - nav.requestStart) },
      'DOM Content Loaded':         { ms: Math.round(nav.domContentLoadedEventEnd) },
      'Full Page Load':             { ms: Math.round(nav.loadEventEnd) },
      'JS Parse + Execute':         { ms: Math.round(nav.domInteractive - nav.responseEnd) },
    });

    // Top 10 slowest resources
    const slow = [...resources]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(r => ({
        name: r.name.split('/').pop().substring(0, 50),
        'duration (ms)': Math.round(r.duration),
        'size (KB)': Math.round((r.transferSize || 0) / 1024),
        type: r.initiatorType,
      }));

    console.log('%cTop 10 Slowest Resources', 'color:#f59e0b;font-weight:bold');
    console.table(slow);

    // Scripts specifically
    const scripts = resources
      .filter(r => r.initiatorType === 'script')
      .sort((a, b) => b.duration - a.duration)
      .map(r => ({
        name: r.name.split('/').pop().substring(0, 60),
        'duration (ms)': Math.round(r.duration),
        'size (KB)': Math.round((r.transferSize || 0) / 1024),
      }));

    console.log('%cScripts', 'color:#f59e0b;font-weight:bold');
    console.table(scripts);

    console.groupEnd();
  }, 3000); // wait 3s so lazy-loaded chunks are captured too
});

// LCP + FCP via PerformanceObserver
try {
  new PerformanceObserver((list) => {
    list.getEntries().forEach(e => {
      console.log(`%c🎨 FCP: ${Math.round(e.startTime)}ms`, 'color:#22c55e;font-weight:bold');
    });
  }).observe({ type: 'paint', buffered: true });

  new PerformanceObserver((list) => {
    const last = list.getEntries().at(-1);
    if (last) console.log(`%c🖼 LCP: ${Math.round(last.startTime)}ms — "${last.element?.tagName || 'unknown'}" ${last.url ? '← ' + last.url.split('/').pop() : ''}`, 'color:#ef4444;font-weight:bold');
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  new PerformanceObserver((list) => {
    list.getEntries().forEach(e => {
      if (e.processingStart - e.startTime > 50)
        console.warn(`%c🐢 Long Task: ${Math.round(e.duration)}ms`, 'color:#f59e0b');
    });
  }).observe({ type: 'longtask', buffered: true });
} catch (e) { /* observer not supported */ }
// ──────────────────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
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
