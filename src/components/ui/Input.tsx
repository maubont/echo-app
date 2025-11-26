import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, icon, className, ...props }) => (
    <div className="w-full">
        {label && <label className="block text-xs font-bold text-theme-tertiary uppercase mb-1">{label}</label>}
        <div className="relative">
            {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary">{icon}</div>}
            <input
                className={`w-full border rounded-lg p-3 text-sm outline-none transition-all focus:shadow-theme-md ${icon ? 'pl-10' : ''} ${className}`}
                style={{
                    background: 'rgba(39, 39, 42, 0.5)',
                    borderColor: 'rgba(88, 101, 242, 0.2)',
                    color: 'rgb(250 250 250)',
                }}
                {...props}
            />
        </div>
    </div>
);
