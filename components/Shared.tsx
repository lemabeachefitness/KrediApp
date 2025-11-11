

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { XIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon, XCircleIcon } from './Icons';
import type { ToastMessage } from '../types';

// --- Date Utilities ---
const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Formats an ISO string date into a dd/MM/yyyy string, correctly handling the Brasília timezone.
 * @param isoString - The ISO date string to format.
 * @returns A formatted date string (e.g., "25/12/2023").
 */
export const formatDateForBrasilia = (isoString: string): string => {
    if (!isoString) return '';
    // Create a date object, but interpret the ISO string as if it's already in the target timezone
    // by splitting and reassembling, which avoids automatic local timezone conversion by the browser.
    const [year, month, day] = isoString.split('T')[0].split('-').map(Number);
    // Note: Months are 0-indexed in JS Dates
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
};


/**
 * Gets the current date set to the beginning of the day (00:00:00) in the Brasília timezone.
 * @returns A Date object representing today in Brasília.
 */
export const getTodayInBrasilia = (): Date => {
    const now = new Date();
    // Get the current date string in Brasília timezone
    const brasiliaDateString = now.toLocaleDateString('pt-BR', { timeZone: BRASILIA_TIMEZONE });
    // Parse it back into a Date object
    const [day, month, year] = brasiliaDateString.split('/').map(Number);
    // Note: Months are 0-indexed in JS Dates
    const today = new Date(year, month - 1, day);
    today.setHours(0,0,0,0);
    return today;
};

/**
 * Calculates the number of days a due date is overdue compared to today in Brasília timezone.
 * Returns 0 if the date is not overdue.
 * @param isoDueDateString - The ISO due date string.
 * @returns The number of full days overdue.
 */
export const calculateDaysOverdue = (isoDueDateString: string): number => {
    if (!isoDueDateString) return 0;

    const today = getTodayInBrasilia(); // This is already at 00:00:00 Brasília time
    
    // Parse the due date string as a date at midnight in the local timezone.
    // This avoids timezone shifts from parsing.
    const dueDate = new Date(isoDueDateString.split('T')[0] + 'T00:00:00');
    
    // Check if due date is in the past. If not, it's not overdue.
    if (dueDate.getTime() >= today.getTime()) {
        return 0;
    }

    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};


// Toast Context
export const ToastManager = createContext<(message: string, type: 'success' | 'error' | 'info') => void>(() => {});

export const useToasts = () => useContext(ToastManager);

// Toast Component
interface ToastProps extends ToastMessage {
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const baseClasses = 'flex items-center w-full max-w-xs p-4 space-x-4 text-gray-500 bg-white divide-x divide-gray-200 rounded-lg shadow-lg dark:text-gray-400 dark:divide-gray-700 dark:bg-gray-800';
  const typeClasses = {
    success: 'text-green-500 dark:text-green-400',
    error: 'text-red-500 dark:text-red-400',
    info: 'text-blue-500 dark:text-blue-400',
  };
  const Icon = {
    success: <CheckCircleIcon />,
    error: <XCircleIcon />,
    info: <InfoIcon />,
  }[type];

  return (
    <div className={baseClasses} role="alert">
      <div className={typeClasses[type]}>{Icon}</div>
      <div className="pl-4 text-sm font-normal">{message}</div>
      <button onClick={onClose} className="p-1.5 ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-white dark:hover:bg-gray-700">
        <XIcon />
      </button>
    </div>
  );
};


// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'lg' }) => {
  if (!isOpen) return null;
  
  const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog" onClick={onClose}>
      <div className={`relative flex flex-col w-full ${sizeClasses[size]} mx-4 bg-white rounded-lg shadow-xl dark:bg-gray-800 max-h-[85vh]`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 shrink-0">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 dark:hover:text-white">
            <XIcon />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
        {footer && <div className="p-4 border-t dark:border-gray-700 shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

// Card Component
interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}
export const Card: React.FC<CardProps> = ({ children, className, title }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 ${className}`}>
    {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{title}</h3>}
    {children}
  </div>
);

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = 'primary', ...props }, ref) => {
    const baseClasses = 'px-4 py-2 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    const variantClasses = {
      primary: 'text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
      secondary: 'text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500',
      danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
    };
    return (
      <button ref={ref} className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);


// Currency Input
const formatCurrency = (value: number | undefined | null) => {
    if (value === null || value === undefined || isNaN(value)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const parseCurrency = (value: string): number => {
    const number = parseFloat(value.replace(/[^0-9,-]+/g, "").replace(",", "."));
    return isNaN(number) ? 0 : number;
};

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, ...props }) => {
    // FIX: This component was not functional due to multiple syntax and logic errors. It has been rewritten to correctly handle state and events.
    const [displayValue, setDisplayValue] = useState(formatCurrency(value));

    useEffect(() => {
        // This effect syncs the display value with the prop value, but only if they represent different numbers.
        // This prevents the user's input from being overwritten while they are typing a valid number.
        if (parseCurrency(displayValue) !== value) {
            setDisplayValue(formatCurrency(value));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        setDisplayValue(rawValue);
        const parsedValue = parseCurrency(rawValue);
        onChange(isNaN(parsedValue) ? undefined : parsedValue);
    };
    
     const handleBlur = () => {
        // On blur, always format to the canonical currency representation.
        setDisplayValue(formatCurrency(value));
    };

    return (
        <input
            {...props}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
};