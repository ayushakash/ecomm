/**
 * City Name Mapping Utility
 * Handles variations in city names (e.g., Bengaluru vs Bangalore)
 */

// Map of common city name variations
const CITY_NAME_VARIATIONS = {
  // Bengaluru variations
  'bengaluru': ['bangalore', 'bengaluru', 'bangaluru', 'bengalore'],
  'bangalore': ['bangalore', 'bengaluru', 'bangaluru', 'bengalore'],

  // Mumbai variations
  'mumbai': ['mumbai', 'bombay'],
  'bombay': ['mumbai', 'bombay'],

  // Chennai variations
  'chennai': ['chennai', 'madras'],
  'madras': ['chennai', 'madras'],

  // Kolkata variations
  'kolkata': ['kolkata', 'calcutta'],
  'calcutta': ['kolkata', 'calcutta'],

  // Pune variations
  'pune': ['pune', 'poona'],
  'poona': ['pune', 'poona'],

  // Delhi variations
  'delhi': ['delhi', 'new delhi'],
  'new delhi': ['delhi', 'new delhi'],

  // Kochi variations
  'kochi': ['kochi', 'cochin'],
  'cochin': ['kochi', 'cochin'],

  // Thiruvananthapuram variations
  'thiruvananthapuram': ['thiruvananthapuram', 'trivandrum'],
  'trivandrum': ['thiruvananthapuram', 'trivandrum'],

  // Bhubaneswar variations
  'bhubaneswar': ['bhubaneswar', 'bhubaneshwar'],
  'bhubaneshwar': ['bhubaneswar', 'bhubaneshwar'],

  // Ranchi variations (for your project)
  'ranchi': ['ranchi']
};

/**
 * Get all possible variations of a city name
 * @param {string} cityName - Input city name
 * @returns {string[]} - Array of all possible variations
 */
export const getCityVariations = (cityName) => {
  if (!cityName) return [];

  const normalized = cityName.toLowerCase().trim();

  // Check if we have this city in our mapping
  if (CITY_NAME_VARIATIONS[normalized]) {
    return CITY_NAME_VARIATIONS[normalized];
  }

  // If not in mapping, return the original name
  return [normalized];
};

/**
 * Normalize city name to a standard form
 * @param {string} cityName - Input city name
 * @returns {string} - Normalized city name
 */
export const normalizeCityName = (cityName) => {
  if (!cityName) return '';

  const normalized = cityName.toLowerCase().trim();

  // Map to standard name
  const standardNames = {
    'bengaluru': 'Bangalore',
    'bangalore': 'Bangalore',
    'mumbai': 'Mumbai',
    'bombay': 'Mumbai',
    'chennai': 'Chennai',
    'madras': 'Chennai',
    'kolkata': 'Kolkata',
    'calcutta': 'Kolkata',
    'delhi': 'Delhi',
    'new delhi': 'Delhi',
    'pune': 'Pune',
    'poona': 'Pune',
    'kochi': 'Kochi',
    'cochin': 'Kochi',
    'thiruvananthapuram': 'Thiruvananthapuram',
    'trivandrum': 'Thiruvananthapuram',
    'ranchi': 'Ranchi'
  };

  return standardNames[normalized] || cityName;
};

/**
 * Check if two city names are the same (considering variations)
 * @param {string} city1 - First city name
 * @param {string} city2 - Second city name
 * @returns {boolean} - True if they represent the same city
 */
export const areSameCities = (city1, city2) => {
  if (!city1 || !city2) return false;

  const normalized1 = city1.toLowerCase().trim();
  const normalized2 = city2.toLowerCase().trim();

  // Direct match
  if (normalized1 === normalized2) return true;

  // Check variations
  const variations1 = getCityVariations(normalized1);
  const variations2 = getCityVariations(normalized2);

  // Check if there's any overlap in variations
  return variations1.some(v1 => variations2.includes(v1));
};

/**
 * Get display name for a city (handles variations)
 * @param {string} cityName - Input city name
 * @returns {string} - User-friendly display name
 */
export const getCityDisplayName = (cityName) => {
  return normalizeCityName(cityName);
};

export default {
  getCityVariations,
  normalizeCityName,
  areSameCities,
  getCityDisplayName
};
