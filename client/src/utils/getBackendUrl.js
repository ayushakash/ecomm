/**
 * Dynamically detects and returns the backend URL
 * Uses relative URLs in production for proper HTTPS/HTTP handling
 */

const BACKEND_PORT = 5000;
const TIMEOUT = 3000; // 3 second timeout

/**
 * Get the current host IP (works in development)
 */
const getCurrentHostIP = () => {
  // ALWAYS use environment variable if set (highest priority)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Get the hostname/IP from window.location
  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // 'http:' or 'https:'

  // If it's localhost or 127.0.0.1, use HTTP with port
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${BACKEND_PORT}`;
  }

  // In production, use relative URL to avoid mixed content issues
  // This works because Nginx proxies /api to the backend
  if (protocol === 'https:') {
    return ''; // Empty string means use relative URLs (same origin)
  }

  // Fallback for HTTP (development on network IP)
  return `http://${hostname}:${BACKEND_PORT}`;
};

/**
 * Test if backend is accessible at the given URL
 */
const testBackendConnection = async (url) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Try alternative IPs if the primary one doesn't work
 */
const getAlternativeIPs = (primaryIP) => {
  const hostname = window.location.hostname;
  const alternatives = [];

  // Add localhost as fallback
  if (hostname !== 'localhost') {
    alternatives.push(`http://localhost:${BACKEND_PORT}`);
  }

  // If current is not 192.168.1.2, try common local IPs
  if (hostname !== '192.168.1.2') {
    alternatives.push(`http://192.168.1.2:${BACKEND_PORT}`);
  }
  if (hostname !== '192.168.0.1') {
    alternatives.push(`http://192.168.0.1:${BACKEND_PORT}`);
  }
  if (hostname !== '127.0.0.1') {
    alternatives.push(`http://127.0.0.1:${BACKEND_PORT}`);
  }

  return alternatives;
};

/**
 * Main function to get backend URL with fallback
 */
export const getBackendUrl = async () => {
  // First, try to use environment variable if set
  if (process.env.REACT_APP_API_URL) {
    console.log('Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  // Get primary URL based on current hostname
  const primaryURL = getCurrentHostIP();
  console.log('Testing primary backend URL:', primaryURL);

  // Test if backend is accessible
  const isPrimaryWorking = await testBackendConnection(primaryURL);
  if (isPrimaryWorking) {
    console.log('✅ Backend found at:', primaryURL);
    return primaryURL;
  }

  console.warn('⚠️ Primary backend URL not working:', primaryURL);

  // Try alternative IPs
  const alternatives = getAlternativeIPs(primaryURL);
  for (const altURL of alternatives) {
    console.log('Testing alternative:', altURL);
    const isWorking = await testBackendConnection(altURL);
    if (isWorking) {
      console.log('✅ Backend found at:', altURL);
      return altURL;
    }
  }

  // If all fail, return primary URL as last resort
  console.error('❌ Could not connect to backend. Using default:', primaryURL);
  return primaryURL;
};

/**
 * Synchronous version that returns the primary URL immediately
 * (Better for initial axios setup)
 */
export const getBackendUrlSync = () => {
  // ALWAYS use environment variable if set (highest priority)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Check if we're on HTTPS - use relative URLs
  if (window.location.protocol === 'https:') {
    return ''; // Empty string means relative URLs (same origin)
  }

  return getCurrentHostIP();
};
