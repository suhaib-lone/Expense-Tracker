/**
 * Signin Page
 * Login form with validation, remember me, and API integration
 */

import React, { useState, FormEvent, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { PasswordInput } from '../components/PasswordInput';
import { FormError } from '../components/FormError';
import { validateEmail } from '../utils/validation';
import { login, ApiError, getFieldError } from '../utils/auth';

interface FormData {
  email: string;
  password: string;
  remember: boolean;
}

interface FormTouched {
  email: boolean;
  password: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export const Signin: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    remember: false,
  });

  const [touched, setTouched] = useState<FormTouched>({
    email: false,
    password: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear API error when user starts typing
    if (apiError) {
      setApiError(null);
    }

    // Validate on change for better UX
    if (touched[name as keyof FormTouched]) {
      validateField(name as keyof FormData, value);
    }
  };

  // Handle input blur
  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name as keyof FormData, value);
  };

  // Validate individual field
  const validateField = (field: keyof FormData, value: string) => {
    let result;

    switch (field) {
      case 'email':
        result = validateEmail(value);
        break;
      case 'password':
        result = value.trim() !== '' 
          ? { isValid: true } 
          : { isValid: false, error: 'Password is required' };
        break;
      default:
        result = { isValid: true };
    }

    setErrors((prev) => ({
      ...prev,
      [field]: result.error,
    }));

    return result.isValid;
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const emailValid = validateField('email', formData.email);
    const passwordValid = validateField('password', formData.password);

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
    });

    return emailValid && passwordValid;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Call login API
      await login({
        email: formData.email,
        password: formData.password,
        remember: formData.remember,
      });

      // Show success state briefly
      setShowSuccess(true);

      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (error) {
      setApiError(error as ApiError);
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return (
      !errors.email &&
      !errors.password &&
      formData.email &&
      formData.password
    );
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white/95 backdrop-blur-xl border-2 border-white/30 rounded-3xl p-10 animate-fadeIn shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
              Welcome Back!
            </h2>
            <p className="text-gray-600 text-lg">Redirecting to your dashboard...</p>
            <div className="mt-6 flex justify-center">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-12 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl mb-4 shadow-2xl">
            <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">Welcome Back</h1>
          <p className="text-slate-300 text-lg">Sign in to access your account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
          {apiError && (
            <FormError
              message={apiError.message}
              onDismiss={() => setApiError(null)}
            />
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={getFieldError(apiError, 'email') || errors.email}
              touched={touched.email}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <PasswordInput
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={getFieldError(apiError, 'password') || errors.password}
              touched={touched.password}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center group">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={formData.remember}
                  onChange={handleChange}
                  className="h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-700 cursor-pointer group-hover:text-gray-900 transition-colors">
                  Remember me
                </label>
              </div>

              <button
                type="button"
                className="text-sm text-violet-600 hover:text-violet-700 focus:outline-none focus:underline font-medium transition-colors"
                onClick={() => alert('Forgot password functionality - TODO: Implement password reset flow')}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className={`
                w-full py-3.5 px-4 rounded-xl font-bold text-white text-lg
                transition-all duration-300 transform
                focus:outline-none focus:ring-4 focus:ring-violet-300
                ${
                  isSubmitting || !isFormValid()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
                }
              `}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing In...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
              </div>
            </div>
            <Link
              to="/signup"
              className="mt-4 inline-block font-semibold text-violet-600 hover:text-violet-700 focus:outline-none focus:underline transition-colors"
            >
              Create account here →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
