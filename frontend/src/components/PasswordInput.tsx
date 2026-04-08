/**
 * Password input component with show/hide toggle
 */

import React, { useState, InputHTMLAttributes, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  touched?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  error,
  touched,
  className = '',
  ...inputProps
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const showError = touched && error;

  return (
    <div className="mb-4">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-gray-700 mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          aria-describedby={showError ? errorId : undefined}
          aria-invalid={showError ? 'true' : 'false'}
          className={`
            w-full px-4 py-3 pr-12 border-2 rounded-xl shadow-sm 
            focus:outline-none focus:ring-2 focus:ring-offset-1
            transition-all duration-200
            placeholder:text-gray-400
            ${showError 
              ? 'border-red-400 focus:ring-red-400 focus:border-red-500 bg-red-50' 
              : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-300'
            }
            ${className}
          `}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1.5 transition-all hover:bg-gray-100"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>
      {showError && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-sm text-red-600 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
