/**
 * Dynamically detects and returns the backend URL
 * Tries to connect to the backend on the same IP the frontend is running on
 */

const BACKEND_PORT = 5000;
const TIMEOUT = 3000; // 3 second timeout

/**
 * Get the current host IP (works in development)
 */
const getCurrentHostIP = () => {
  // Get the hostname/IP from window.location.hostname
  const hostname = window.location.hostname;

  // If it's localhost or 127.0.0.1, we might need to find the actual IP
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Try to get from environment variable first
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    // Fallback to localhost
    return `http://localhost:${BACKEND_PORT}`;
  }

  // Return the same IP/hostname as frontend with backend port
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
  // First, try to use environment variable if set
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  return getCurrentHostIP();
};
