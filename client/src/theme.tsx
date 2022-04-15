import type { PropsWithChildren } from 'react';
import { createContext, useEffect, useMemo, useState } from 'react';
import { useRequiredContext } from './react-helpers';

type Theme = 'dark' | 'light';
type ThemeContextValue = [Theme, (theme: Theme) => void];

const themeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren<{}>) {
  const [theme, setTheme] = useState(
    (localStorage.getItem('theme') as Theme | null) ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  );
  const contextValue: ThemeContextValue = useMemo(
    () => [
      theme,
      (newTheme) => {
        localStorage.setItem('theme', newTheme);
        setTheme(newTheme);
      },
    ],
    [theme],
  );

  useEffect(() => {
    document.querySelector('html')!.dataset.theme = theme;
  }, [theme]);

  return <themeContext.Provider value={contextValue}>{children}</themeContext.Provider>;
}

export function useThemeState() {
  return useRequiredContext(themeContext);
}

// Keep in sync with _colors.scss
// TODO: Deduplicate somehow?
const colors = {
  dark: {
    accent: 'hsl(340, 90%, 70%)',
    'accent-background': 'hsl(340, 10%, 7%)',
    'accent-hover': 'hsl(340, 30%, 50%)',
    'accent-light': 'hsl(340, 90%, 80%)',
    background: 'hsl(340, 10%, 14%)',
    content: '#eee',
    control: '#9cf',
    'control-background': '#9cf2',
    'control-heavy': '#69f',
    'rating--3': '#f33',
    'rating--3-background': '#f331',
    'rating--3-hover': '#fcc',
    'rating--2': '#f55',
    'rating--1': '#f77',
    'rating-0': '#fb3',
    'rating-1': '#6b6',
    'rating-2': '#4b4',
    'rating-3': '#2b2',
    'rating-3-background': '#2b21',
    'secondary-accent': 'hsl(280, 90%, 70%)',
    'secondary-accent-hover': 'hsl(280, 30%, 50%)',
  },
  light: {
    accent: '#f6a',
    'accent-background': '#fff0f8',
    'accent-hover': '#fde',
    'accent-light': '#f9c',
    background: '#fff',
    content: '#333',
    control: '#9cf',
    'control-background': '#9cf2',
    'control-heavy': '#69f',
    'rating--3': '#f22',
    'rating--3-background': '#f221',
    'rating--3-hover': '#fbb',
    'rating--2': '#f44',
    'rating--1': '#f66',
    'rating-0': '#fa2',
    'rating-1': '#5a5',
    'rating-2': '#3a3',
    'rating-3': '#1a1',
    'rating-3-background': '#1a11',
    'secondary-accent': 'rgb(236, 94, 255)',
    'secondary-accent-hover': 'rgb(248, 207, 253)',
  },
} as const;

export function useColors() {
  const [theme] = useRequiredContext(themeContext);

  return colors[theme];
}
