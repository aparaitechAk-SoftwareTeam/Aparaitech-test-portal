/**
 * Code Generator Utility
 * ======================
 * Generates unique 6-character alphanumeric test codes.
 * Example: "AB3X7K"
 */

/**
 * Generate a random 6-char uppercase alphanumeric code
 * @returns {string} e.g. "FX93KQ"
 */
function generateTestCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed ambiguous chars O,0,1,I
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a 6-digit numeric OTP
 * @returns {string} e.g. "483920"
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = { generateTestCode, generateOTP };
