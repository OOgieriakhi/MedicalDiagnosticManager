import { createContext, ReactNode, useContext, useState, useEffect } from "react";

export type MoodTheme = 
  | "professional" 
  | "calm" 
  | "energetic" 
  | "warm" 
  | "cool" 
  | "nature" 
  | "sunset" 
  | "ocean";

interface ThemeContextType {
  currentTheme: MoodTheme;
  setTheme: (theme: MoodTheme) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const moodThemes: Record<MoodTheme, { 
  name: string; 
  description: string; 
  emoji: string;
  colors: {
    light: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      foreground: string;
      muted: string;
      mutedForeground: string;
      border: string;
      card: string;
      cardForeground: string;
    };
    dark: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      foreground: string;
      muted: string;
      mutedForeground: string;
      border: string;
      card: string;
      cardForeground: string;
    };
  };
}> = {
  professional: {
    name: "Professional",
    description: "Clean and business-focused",
    emoji: "💼",
    colors: {
      light: {
        primary: "210 40% 20%",
        secondary: "210 40% 96%",
        accent: "210 40% 90%",
        background: "0 0% 100%",
        foreground: "210 40% 20%",
        muted: "210 40% 96%",
        mutedForeground: "215 16% 47%",
        border: "214 32% 91%",
        card: "0 0% 100%",
        cardForeground: "210 40% 20%",
      },
      dark: {
        primary: "210 40% 80%",
        secondary: "217 33% 17%",
        accent: "217 33% 20%",
        background: "222 84% 5%",
        foreground: "210 40% 98%",
        muted: "217 33% 17%",
        mutedForeground: "215 20% 65%",
        border: "217 33% 17%",
        card: "222 84% 5%",
        cardForeground: "210 40% 98%",
      },
    },
  },
  calm: {
    name: "Calm",
    description: "Peaceful and serene",
    emoji: "🧘",
    colors: {
      light: {
        primary: "200 100% 28%",
        secondary: "200 100% 96%",
        accent: "200 50% 85%",
        background: "180 20% 99%",
        foreground: "200 50% 15%",
        muted: "200 50% 96%",
        mutedForeground: "200 25% 45%",
        border: "200 50% 90%",
        card: "180 20% 99%",
        cardForeground: "200 50% 15%",
      },
      dark: {
        primary: "200 100% 70%",
        secondary: "200 50% 15%",
        accent: "200 50% 20%",
        background: "200 50% 3%",
        foreground: "200 50% 90%",
        muted: "200 50% 15%",
        mutedForeground: "200 25% 65%",
        border: "200 50% 15%",
        card: "200 50% 3%",
        cardForeground: "200 50% 90%",
      },
    },
  },
  energetic: {
    name: "Energetic",
    description: "Vibrant and dynamic",
    emoji: "⚡",
    colors: {
      light: {
        primary: "345 82% 40%",
        secondary: "345 82% 95%",
        accent: "45 100% 85%",
        background: "0 0% 100%",
        foreground: "345 82% 20%",
        muted: "345 40% 95%",
        mutedForeground: "345 25% 45%",
        border: "345 40% 88%",
        card: "0 0% 100%",
        cardForeground: "345 82% 20%",
      },
      dark: {
        primary: "345 82% 70%",
        secondary: "345 40% 15%",
        accent: "45 100% 25%",
        background: "345 40% 3%",
        foreground: "345 40% 95%",
        muted: "345 40% 15%",
        mutedForeground: "345 25% 65%",
        border: "345 40% 15%",
        card: "345 40% 3%",
        cardForeground: "345 40% 95%",
      },
    },
  },
  warm: {
    name: "Warm",
    description: "Cozy and inviting",
    emoji: "🔥",
    colors: {
      light: {
        primary: "25 75% 47%",
        secondary: "25 75% 95%",
        accent: "45 100% 88%",
        background: "30 40% 98%",
        foreground: "25 75% 15%",
        muted: "25 40% 95%",
        mutedForeground: "25 25% 45%",
        border: "25 40% 88%",
        card: "30 40% 98%",
        cardForeground: "25 75% 15%",
      },
      dark: {
        primary: "25 75% 70%",
        secondary: "25 40% 12%",
        accent: "45 100% 20%",
        background: "25 40% 4%",
        foreground: "25 40% 95%",
        muted: "25 40% 12%",
        mutedForeground: "25 25% 65%",
        border: "25 40% 12%",
        card: "25 40% 4%",
        cardForeground: "25 40% 95%",
      },
    },
  },
  cool: {
    name: "Cool",
    description: "Fresh and modern",
    emoji: "❄️",
    colors: {
      light: {
        primary: "185 84% 39%",
        secondary: "185 84% 95%",
        accent: "200 100% 88%",
        background: "180 20% 99%",
        foreground: "185 84% 15%",
        muted: "185 40% 95%",
        mutedForeground: "185 25% 45%",
        border: "185 40% 88%",
        card: "180 20% 99%",
        cardForeground: "185 84% 15%",
      },
      dark: {
        primary: "185 84% 70%",
        secondary: "185 40% 12%",
        accent: "200 100% 20%",
        background: "185 40% 4%",
        foreground: "185 40% 95%",
        muted: "185 40% 12%",
        mutedForeground: "185 25% 65%",
        border: "185 40% 12%",
        card: "185 40% 4%",
        cardForeground: "185 40% 95%",
      },
    },
  },
  nature: {
    name: "Nature",
    description: "Natural and organic",
    emoji: "🌿",
    colors: {
      light: {
        primary: "120 60% 30%",
        secondary: "120 60% 95%",
        accent: "80 60% 85%",
        background: "120 20% 98%",
        foreground: "120 60% 15%",
        muted: "120 30% 95%",
        mutedForeground: "120 20% 45%",
        border: "120 30% 88%",
        card: "120 20% 98%",
        cardForeground: "120 60% 15%",
      },
      dark: {
        primary: "120 60% 70%",
        secondary: "120 30% 12%",
        accent: "80 60% 20%",
        background: "120 30% 4%",
        foreground: "120 30% 95%",
        muted: "120 30% 12%",
        mutedForeground: "120 20% 65%",
        border: "120 30% 12%",
        card: "120 30% 4%",
        cardForeground: "120 30% 95%",
      },
    },
  },
  sunset: {
    name: "Sunset",
    description: "Warm evening glow",
    emoji: "🌅",
    colors: {
      light: {
        primary: "15 86% 53%",
        secondary: "15 86% 95%",
        accent: "45 100% 88%",
        background: "30 50% 98%",
        foreground: "15 86% 15%",
        muted: "15 40% 95%",
        mutedForeground: "15 25% 45%",
        border: "15 40% 88%",
        card: "30 50% 98%",
        cardForeground: "15 86% 15%",
      },
      dark: {
        primary: "15 86% 70%",
        secondary: "15 40% 12%",
        accent: "45 100% 20%",
        background: "15 40% 4%",
        foreground: "15 40% 95%",
        muted: "15 40% 12%",
        mutedForeground: "15 25% 65%",
        border: "15 40% 12%",
        card: "15 40% 4%",
        cardForeground: "15 40% 95%",
      },
    },
  },
  ocean: {
    name: "Ocean",
    description: "Deep and mysterious",
    emoji: "🌊",
    colors: {
      light: {
        primary: "210 100% 40%",
        secondary: "210 100% 95%",
        accent: "195 100% 85%",
        background: "210 20% 99%",
        foreground: "210 100% 15%",
        muted: "210 50% 95%",
        mutedForeground: "210 25% 45%",
        border: "210 50% 88%",
        card: "210 20% 99%",
        cardForeground: "210 100% 15%",
      },
      dark: {
        primary: "210 100% 70%",
        secondary: "210 50% 12%",
        accent: "195 100% 20%",
        background: "210 50% 4%",
        foreground: "210 50% 95%",
        muted: "210 50% 12%",
        mutedForeground: "210 25% 65%",
        border: "210 50% 12%",
        card: "210 50% 4%",
        cardForeground: "210 50% 95%",
      },
    },
  },
};

export { moodThemes };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<MoodTheme>(() => {
    const stored = localStorage.getItem("mood-theme");
    return (stored as MoodTheme) || "professional";
  });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("dark-mode");
    return stored === "true";
  });

  const setTheme = (theme: MoodTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem("mood-theme", theme);
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("dark-mode", newMode.toString());
  };

  useEffect(() => {
    const root = document.documentElement;
    const theme = moodThemes[currentTheme];
    const colors = isDarkMode ? theme.colors.dark : theme.colors.light;

    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    // Add/remove dark class
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [currentTheme, isDarkMode]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}