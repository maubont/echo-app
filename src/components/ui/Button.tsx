import React from 'react';

interface ButtonProps {
    onClick?: () => void;
    label: string;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
    size?: 'xs' | 'sm' | 'md';
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit';
    className?: string;
}

export const Button: React.FC<ButtonProps> = ({ onClick, label, icon, variant = 'primary', size = 'md', fullWidth = false, disabled, loading, type = 'button', className = '' }) => {
    const base = "rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";
    const sizes = { xs: "py-1.5 px-3 text-xs", sm: "py-2 px-4 text-sm", md: "py-3 px-6 text-base" };
    const variants = {
        primary: "bg-primary text-white shadow-theme-lg hover:shadow-theme-xl hover:-translate-y-0.5 border border-transparent",
        secondary: "bg-theme-card text-theme-primary border shadow-theme-sm hover:shadow-theme-md",
        outline: "bg-transparent border-2 text-theme-secondary hover:text-theme-primary",
        ghost: "bg-transparent text-theme-secondary hover:bg-theme-secondary/10 hover:text-theme-primary",
        danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
        >
            {loading && <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />}
            {!loading && icon}
            {label}
        </button>
    );
};
