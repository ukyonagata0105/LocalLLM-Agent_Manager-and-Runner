/**
 * Loading Spinner Component
 * Reusable loading spinner with size variants.
 */

import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-10 h-10'
    };

    return (
        <div
            className={`${sizeClasses[size]} border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin ${className}`}
        />
    );
};

interface LoadingOverlayProps {
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => {
    return (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <span className="text-gray-300 text-sm">{message}</span>
            </div>
        </div>
    );
};

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
    loading = false,
    children,
    disabled,
    className = '',
    ...props
}) => {
    return (
        <button
            {...props}
            disabled={disabled || loading}
            className={`relative flex items-center justify-center gap-2 ${className}`}
        >
            {loading && <Spinner size="sm" />}
            <span className={loading ? 'opacity-70' : ''}>{children}</span>
        </button>
    );
};
