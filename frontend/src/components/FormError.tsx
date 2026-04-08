/**
 * Form error banner for server-side errors
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface FormErrorProps {
  message: string;
  onDismiss?: () => void;
}

export const FormError: React.FC<FormErrorProps> = ({ message, onDismiss }) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-4 mb-6 rounded-xl shadow-sm animate-fadeIn"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0 bg-red-100 rounded-full p-1 mr-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-red-800 mb-1">Error</h4>
            <p className="text-sm text-red-700">{message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg p-1 ml-4 transition-all hover:bg-red-100"
            aria-label="Dismiss error"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
