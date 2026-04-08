/**
 * Password strength meter component
 */

import React from 'react';
import { PasswordStrength } from '../utils/validation';

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
  show: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  strength,
  show,
}) => {
  if (!show) return null;

  const strengthConfig = {
    weak: { icon: '⚠️', text: 'Weak password', bgColor: 'bg-red-500' },
    medium: { icon: '🔒', text: 'Good password', bgColor: 'bg-yellow-500' },
    strong: { icon: '✅', text: 'Strong password', bgColor: 'bg-green-500' },
  };

  const config = strengthConfig[strength.label];

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200" aria-live="polite">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${strength.color}`}
            style={{ width: `${((strength.score + 1) / 4) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-gray-700 capitalize min-w-[60px] text-right">
          {strength.label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base">{config.icon}</span>
        <p className="text-xs text-gray-600 font-medium">
          {config.text}
        </p>
      </div>
    </div>
  );
};
