/**
 * validationHelper.js
 * Centralised input-validation utilities.
 * All functions return { valid: true } on success,
 * or { valid: false, message: '...' } on failure.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX  = /^[a-zA-Z]+(\s[a-zA-Z]+)*$/;
const PHONE_REGEX = /^[0-9]{10}$/;
const INTL_PHONE_REGEX = /^[0-9+\-\s()]{8,20}$/;
const OTP_REGEX   = /^\d{4}$/;

/**
 * Validate email address.
 * @param {string} email
 */
const validateEmail = (email) => {
    if (!email || email.trim().length === 0) {
        return { valid: false, message: 'Email is required' };
    }
    if (!EMAIL_REGEX.test(email.trim())) {
        return { valid: false, message: 'Please enter a valid email address' };
    }
    return { valid: true };
};

/**
 * Validate password strength.
 * Rules: min 8 chars, at least one uppercase, one lowercase, one digit.
 * @param {string} password
 */
const validatePassword = (password) => {
    if (!password) {
        return { valid: false, message: 'Password is required' };
    }
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/\d/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true };
};

/**
 * Validate full name.
 * Rules: letters only with single spaces, length 2-50.
 * @param {string} name
 * @param {{ min?: number, max?: number }} [options]
 */
const validateFullName = (name, { min = 2, max = 50 } = {}) => {
    if (!name || name.trim().length === 0) {
        return { valid: false, message: 'Full name is required' };
    }
    const trimmed = name.trim();
    if (!NAME_REGEX.test(trimmed)) {
        return { valid: false, message: 'Full name can only contain letters and single spaces between words' };
    }
    if (trimmed.length < min || trimmed.length > max) {
        return { valid: false, message: `Full name must be between ${min} and ${max} characters` };
    }
    return { valid: true };
};

/**
 * Validate a 10-digit phone number (domestic format).
 * @param {string} phone
 */
const validatePhone = (phone) => {
    if (!phone || phone.trim().length === 0) {
        return { valid: true }; // Phone is optional in most places
    }
    if (!PHONE_REGEX.test(phone.trim())) {
        return { valid: false, message: 'Please enter a valid 10-digit phone number' };
    }
    return { valid: true };
};

/**
 * Validate international phone (broader format, 8–20 chars).
 * @param {string} phone
 */
const validateIntlPhone = (phone) => {
    if (!phone || phone.trim().length === 0) {
        return { valid: true }; // Optional
    }
    if (!INTL_PHONE_REGEX.test(phone.trim())) {
        return { valid: false, message: 'Please enter a valid phone number' };
    }
    return { valid: true };
};

/**
 * Validate a 4-digit numeric OTP.
 * @param {string} otp
 */
const validateOTP = (otp) => {
    if (!otp || otp.trim().length === 0) {
        return { valid: false, message: 'OTP is required' };
    }
    if (!OTP_REGEX.test(otp.trim())) {
        return { valid: false, message: 'OTP must be a 4-digit number' };
    }
    return { valid: true };
};

/**
 * Validate bio/description length.
 * @param {string} bio
 * @param {number} [maxLength=500]
 */
const validateBio = (bio, maxLength = 500) => {
    if (bio && bio.trim().length > maxLength) {
        return { valid: false, message: `Bio must be ${maxLength} characters or less` };
    }
    return { valid: true };
};

export {
    validateEmail,
    validatePassword,
    validateFullName,
    validatePhone,
    validateIntlPhone,
    validateOTP,
    validateBio,
};
