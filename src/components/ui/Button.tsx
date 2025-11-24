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
        primary: "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 border border-transparent",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow-md",
        outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:border-slate-800 hover:text-slate-900",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
