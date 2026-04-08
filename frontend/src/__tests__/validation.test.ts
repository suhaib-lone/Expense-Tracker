/**
 * Unit tests for validation utilities
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
  validatePhone,
  calculatePasswordStrength,
} from '../utils/validation';

describe('validateEmail', () => {
  it('should return valid for correct email format', () => {
    expect(validateEmail('test@example.com').isValid).toBe(true);
    expect(validateEmail('user.name+tag@example.co.uk').isValid).toBe(true);
  });

  it('should return invalid for empty email', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email is required');
  });

  it('should return invalid for incorrect email format', () => {
    expect(validateEmail('notanemail').isValid).toBe(false);
    expect(validateEmail('missing@domain').isValid).toBe(false);
    expect(validateEmail('@example.com').isValid).toBe(false);
  });
});

describe('validatePassword', () => {
  it('should return valid for password with 8+ chars, letters, and numbers', () => {
    expect(validatePassword('password123').isValid).toBe(true);
    expect(validatePassword('Secure1Pass').isValid).toBe(true);
  });

  it('should return invalid for empty password', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password is required');
  });

  it('should return invalid for password less than 8 characters', () => {
    const result = validatePassword('pass1');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must be at least 8 characters');
  });

  it('should return invalid for password without letters', () => {
    const result = validatePassword('12345678');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must contain at least one letter');
  });

  it('should return invalid for password without numbers', () => {
    const result = validatePassword('passwordonly');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must contain at least one number');
  });
});

describe('calculatePasswordStrength', () => {
  it('should return weak for empty password', () => {
    const strength = calculatePasswordStrength('');
    expect(strength.label).toBe('weak');
  });

  it('should return weak for short password with low variety', () => {
    const strength = calculatePasswordStrength('pass1');
    expect(strength.label).toBe('weak');
  });

  it('should return medium for decent password', () => {
    const strength = calculatePasswordStrength('password123');
    expect(strength.label).toBe('medium');
  });

  it('should return strong for complex password', () => {
    const strength = calculatePasswordStrength('MyP@ssw0rd!2024');
    expect(strength.label).toBe('strong');
  });
});

describe('validateConfirmPassword', () => {
  it('should return valid when passwords match', () => {
    const result = validateConfirmPassword('password123', 'password123');
    expect(result.isValid).toBe(true);
  });

  it('should return invalid for empty confirm password', () => {
    const result = validateConfirmPassword('password123', '');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Please confirm your password');
  });

  it('should return invalid when passwords do not match', () => {
    const result = validateConfirmPassword('password123', 'different123');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Passwords do not match');
  });
});

describe('validateName', () => {
  it('should return valid for proper names', () => {
    expect(validateName('John Doe').isValid).toBe(true);
    expect(validateName('Alice').isValid).toBe(true);
  });

  it('should return invalid for empty name', () => {
    const result = validateName('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Full name is required');
  });

  it('should return invalid for name less than 2 characters', () => {
    const result = validateName('A');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name must be at least 2 characters');
  });
});

describe('validatePhone', () => {
  it('should return valid for empty phone (optional)', () => {
    expect(validatePhone('').isValid).toBe(true);
  });

  it('should return valid for correct phone format', () => {
    expect(validatePhone('1234567890').isValid).toBe(true);
    expect(validatePhone('+12345678901').isValid).toBe(true);
    expect(validatePhone('123-456-7890').isValid).toBe(true);
  });

  it('should return invalid for non-numeric phone', () => {
    const result = validatePhone('abcdefghij');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Please enter a valid phone number (10-15 digits)');
  });

  it('should return invalid for too short phone', () => {
    const result = validatePhone('123');
    expect(result.isValid).toBe(false);
  });
});
