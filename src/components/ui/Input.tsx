import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, icon, className, ...props }) => (
    <div className="w-full">
        {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>}
        <div className="relative">
            {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
            <input
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-blue-500 transition-colors focus:bg-white ${icon ? 'pl-10' : ''} ${className}`}
                {...props}
            />
        </div>
    </div>
);
