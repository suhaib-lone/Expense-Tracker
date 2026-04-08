/**
 * Validation utilities for form inputs
 * Provides client-side validation with clear error messages
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordStrength {
  score: number; // 0-3: weak, medium, strong
  label: 'weak' | 'medium' | 'strong';
  color: string;
}

/**
 * Validates email format using RFC 5322 simplified regex
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

/**
 * Validates password with minimum requirements
 * - At least 8 characters
 * - At least one letter
 * - At least one number
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.trim() === '') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasLetter) {
    return { isValid: false, error: 'Password must contain at least one letter' };
  }

  if (!hasNumber) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  return { isValid: true };
};

/**
 * Calculates password strength based on length, variety of characters
 */
export const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password || password.length === 0) {
    return { score: 0, label: 'weak', color: 'bg-red-500' };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (varietyCount >= 3) score++;
  if (varietyCount >= 4) score++;

  // Map score to label
  if (score <= 1) {
    return { score, label: 'weak', color: 'bg-red-500' };
  } else if (score <= 2) {
    return { score, label: 'medium', color: 'bg-yellow-500' };
  } else {
    return { score, label: 'strong', color: 'bg-green-500' };
  }
};

/**
 * Validates confirm password matches the original password
 */
export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword || confirmPassword.trim() === '') {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true };
};

/**
 * Validates name field (required, min 2 characters)
 */
export const validateName = (name: string): ValidationResult => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Full name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  return { isValid: true };
};

/**
 * Validates phone number (optional, but must be numeric if provided)
 */
export const validatePhone = (phone: string): ValidationResult => {
  // Phone is optional
  if (!phone || phone.trim() === '') {
    return { isValid: true };
  }

  // Remove common separators
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check if numeric
  const isNumeric = /^\+?\d{10,15}$/.test(cleaned);

  if (!isNumeric) {
    return { isValid: false, error: 'Please enter a valid phone number (10-15 digits)' };
  }

  return { isValid: true };
};
