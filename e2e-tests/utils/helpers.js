// Helper functions for tests

/**
 * Generate random phone number for testing
 */
function generateRandomPhone() {
  const prefix = ['98', '97', '96', '95', '94', '93', '92', '91', '90', '89'];
  const randomPrefix = prefix[Math.floor(Math.random() * prefix.length)];
  const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
  return randomPrefix + randomNumber.toString();
}

/**
 * Generate random email for testing
 */
function generateRandomEmail() {
  const timestamp = Date.now();
  return `test${timestamp}@example.com`;
}

/**
 * Generate random GST number
 */
function generateGSTNumber() {
  const stateCode = '27'; // Maharashtra
  const pan = generateRandomString(10, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  const entity = '1';
  const check = 'Z';
  const default_code = '5';
  return `${stateCode}${pan}${entity}${check}${default_code}`;
}

/**
 * Generate random PAN number
 */
function generatePANNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  return (
    chars[Math.floor(Math.random() * chars.length)] +
    chars[Math.floor(Math.random() * chars.length)] +
    chars[Math.floor(Math.random() * chars.length)] +
    chars[Math.floor(Math.random() * chars.length)] +
    chars[Math.floor(Math.random() * chars.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    chars[Math.floor(Math.random() * chars.length)]
  );
}

/**
 * Generate random string
 */
function generateRandomString(length, chars) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Wait for a specific duration
 */
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  return `₹${amount.toFixed(2)}`;
}

/**
 * Generate random business name
 */
function generateBusinessName() {
  const prefixes = ['Elite', 'Prime', 'Royal', 'Supreme', 'Golden', 'Best'];
  const suffixes = ['Constructions', 'Builders', 'Supplies', 'Materials', 'Traders'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${suffix}`;
}

module.exports = {
  generateRandomPhone,
  generateRandomEmail,
  generateGSTNumber,
  generatePANNumber,
  generateRandomString,
  generateBusinessName,
  wait,
  formatCurrency
};
