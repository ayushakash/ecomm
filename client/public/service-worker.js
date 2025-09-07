// const CACHE_NAME = 'constructmart-v1';
// const urlsToCache = [
//   '/',
//   '/static/js/bundle.js',
//   '/static/css/main.css',
//   '/manifest.json'
// ];

// const RUNTIME_CACHE = 'constructmart-runtime-v1';

// // Install event
// self.addEventListener('install', (event) => {
//   event.waitUntil(
//     caches.open(CACHE_NAME)
//       .then((cache) => {
//         return cache.addAll(urlsToCache);
//       })
//       .catch((error) => {
//         console.log('Cache install failed:', error);
//       })
//   );
// });

// // Fetch event
// self.addEventListener('fetch', (event) => {
//   // Skip cross-origin requests
//   if (!event.request.url.startsWith(self.location.origin)) {
//     return;
//   }

//   event.respondWith(
//     caches.match(event.request)
//       .then((response) => {
//         // Return cached version or fetch from network
//         if (response) {
//           return response;
//         }

//         return fetch(event.request)
//           .then((response) => {
//             // Don't cache non-successful responses
//             if (!response || response.status !== 200 || response.type !== 'basic') {
//               return response;
//             }

//             // Clone the response
//             const responseToCache = response.clone();

//             caches.open(RUNTIME_CACHE)
//               .then((cache) => {
//                 cache.put(event.request, responseToCache);
//               });

//             return response;
//           })
//           .catch(() => {
//             // Return offline page for HTML requests
//             if (event.request.headers.get('accept').includes('text/html')) {
//               return caches.match('/');
//             }
//           });
//       })
//   );
// });

// // Activate event
// self.addEventListener('activate', (event) => {
//   const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  
//   event.waitUntil(
//     caches.keys().then((cacheNames) => {
//       return Promise.all(
//         cacheNames.map((cacheName) => {
//           if (cacheWhitelist.indexOf(cacheName) === -1) {
//             return caches.delete(cacheName);
//           }
//         })
//       );
//     })
//   );
// });