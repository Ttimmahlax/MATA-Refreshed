/**
 * Email Utilities for MATA Chrome Extension
 * 
 * This module provides consistent email handling functions across the extension.
 * The key function is sanitizeEmail which ensures emails are formatted consistently
 * for storage keys by replacing special characters with underscores.
 */

/**
 * Sanitize an email address for use as a storage key
 * Replaces @ and . characters with underscores to avoid issues with key format
 * IMPORTANT: This MUST use the replace(/[@.]/g, '_') pattern for consistency with the web app
 * 
 * @param {string} email - The email address to sanitize
 * @returns {string} - The sanitized email
 */
function sanitizeEmail(email) {
  if (!email) return '';
  
  // First normalize the email
  const normalizedEmail = email.toLowerCase().trim();
  
  // Replace @ and . with underscores
  // This is the STANDARD format that must be used across the entire application
  return normalizedEmail.replace(/[@.]/g, '_');
}

/**
 * Check if an email needs sanitization
 * 
 * @param {string} email - The email address to check
 * @returns {boolean} - True if email contains @ or . characters
 */
function emailNeedsSanitization(email) {
  if (!email) return false;
  return /[@.]/.test(email);
}

/**
 * Get all possible key formats for a given email
 * This helps with backward compatibility when retrieving keys
 * 
 * @param {string} email - The original email address
 * @param {string} prefix - The key prefix (e.g., 'mata_keys_', 'mata_salt_')
 * @returns {Array<string>} - Array of possible key formats
 */
function getAllPossibleKeyFormats(email, prefix) {
  if (!email || !prefix) {
    return [];
  }
  
  const sanitizedEmail = sanitizeEmail(email);
  const formats = [];
  
  // Add standard format: prefix + sanitized email
  formats.push(`${prefix}${sanitizedEmail}`);
  
  // Add alternate formats if they existed in previous versions
  if (prefix === 'mata_keys_' || prefix === 'mata_salt_') {
    formats.push(`${prefix}${email}`); // Raw email (old format)
    
    // Other potential legacy formats
    const legacyFormats = [
      `user_${sanitizedEmail}_keys`,
      `${sanitizedEmail}_keys`,
      `${email}_keys`
    ];
    
    formats.push(...legacyFormats);
  }
  
  return formats;
}

// Export functions for use in extension - making compatible with both service workers and browser contexts
(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)).sanitizeEmail = sanitizeEmail;
(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)).emailNeedsSanitization = emailNeedsSanitization;
(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)).getAllPossibleKeyFormats = getAllPossibleKeyFormats;