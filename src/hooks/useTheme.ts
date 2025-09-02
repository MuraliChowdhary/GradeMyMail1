import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Theme types
type ThemeMode = 'light' | 'dark' | 'system';

// Theme context type
interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  systemTheme: 'light' | 'dark';
}

// Create theme context
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Storage key for theme preference
const THEME_STORAGE_KEY = 'email-analysis-theme';

// Hook to detect system theme preference
const useSystemTheme = (): 'light' | 'dark' => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return systemTheme;
};

// Hook to manage theme state and persistence
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// Theme provider hook
export const useThemeProvider = () => {
  const systemTheme = useSystemTheme();
  
  // Initialize theme from localStorage or default to system
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemeMode;
      }
    } catch (error) {
      console.warn('Failed to read theme from localStorage:', error);
    }
    
    return 'system';
  });

  // Resolve the actual theme to apply
  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme;

  // Set theme with persistence
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, []);

  // Toggle between light and dark (ignoring system)
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setTheme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add current theme class
    root.classList.add(resolvedTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const themeColor = resolvedTheme === 'dark' ? '#1d1d1f' : '#ffffff';
    
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = themeColor;
      document.head.appendChild(meta);
    }
    
  }, [resolvedTheme]);

  // Handle smooth transitions when theme changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Add transition class
    root.classList.add('theme-transition');
    
    // Remove transition class after animation completes
    const timer = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
    
    return () => clearTimeout(timer);
  }, [resolvedTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    systemTheme,
  };
};

// Hook for accessing current theme values
export const useThemeValues = () => {
  const { resolvedTheme } = useTheme();
  return { theme: resolvedTheme };
};

// Hook for responsive design
export const useBreakpoint = () => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('sm');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const breakpoints = {
      xs: 475,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    };

    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= breakpoints['2xl']) setCurrentBreakpoint('2xl');
      else if (width >= breakpoints.xl) setCurrentBreakpoint('xl');
      else if (width >= breakpoints.lg) setCurrentBreakpoint('lg');
      else if (width >= breakpoints.md) setCurrentBreakpoint('md');
      else if (width >= breakpoints.sm) setCurrentBreakpoint('sm');
      else setCurrentBreakpoint('xs');
    };

    updateBreakpoint();
    
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return currentBreakpoint;
};

// Hook for container queries (modern responsive design)
export const useContainerQuery = (containerRef: React.RefObject<HTMLElement | null>) => {
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [containerRef]);

  // Return container-based breakpoint
  const getContainerBreakpoint = () => {
    if (containerWidth >= 1280) return '2xl';
    if (containerWidth >= 1024) return 'xl';
    if (containerWidth >= 768) return 'lg';
    if (containerWidth >= 640) return 'md';
    if (containerWidth >= 475) return 'sm';
    return 'xs';
  };

  return {
    containerWidth,
    containerBreakpoint: getContainerBreakpoint(),
  };
};