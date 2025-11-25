import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type ThemeName = 'aurora' | 'nebula' | 'quantum';

interface ThemeContextType {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    // Default to Quantum theme for the entire app
    const [theme, setThemeState] = useState<ThemeName>('quantum');

    // Commented out for now - will enable contextual themes later
    // useEffect(() => {
    //     const path = location.pathname;
    //     
    //     if (path === '/chat') {
    //         setThemeState('nebula');
    //     } else if (path === '/map') {
    //         setThemeState('quantum');
    //     } else {
    //         setThemeState('aurora');
    //     }
    // }, [location.pathname]);

    // Apply theme to document root
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        // Also add class for easier CSS targeting
        document.documentElement.className = `theme-${theme}`;
    }, [theme]);

    const setTheme = (newTheme: ThemeName) => {
        setThemeState(newTheme);
        // Optionally save to localStorage for manual override
        localStorage.setItem('proxi-theme-override', newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
