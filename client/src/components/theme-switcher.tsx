import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme, moodThemes, type MoodTheme } from "@/hooks/use-theme";
import { Palette, Moon, Sun, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeSwitcher() {
  const { currentTheme, setTheme, isDarkMode, toggleDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (theme: MoodTheme) => {
    setTheme(theme);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick Dark Mode Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        className="relative"
      >
        <AnimatePresence mode="wait">
          {isDarkMode ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-4 w-4" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-4 w-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Theme Selector */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Palette className="h-4 w-4" />
            <motion.div
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary"
              style={{ 
                backgroundColor: `hsl(var(--primary))` 
              }}
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Choose Your Mood
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select a color palette that matches your current vibe
            </p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {Object.entries(moodThemes).map(([key, theme]) => {
              const isSelected = currentTheme === key;
              const colors = isDarkMode ? theme.colors.dark : theme.colors.light;
              
              return (
                <motion.div
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Card 
                    className={`cursor-pointer relative overflow-hidden transition-all duration-200 hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleThemeChange(key as MoodTheme)}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute top-2 right-2 z-10"
                      >
                        <Badge variant="default" className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Active
                        </Badge>
                      </motion.div>
                    )}
                    
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="text-2xl">{theme.emoji}</span>
                        {theme.name}
                      </CardTitle>
                      <CardDescription>{theme.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      {/* Color Preview */}
                      <div className="grid grid-cols-5 gap-1 mb-3">
                        <motion.div
                          className="h-8 rounded-md"
                          style={{ backgroundColor: `hsl(${colors.primary})` }}
                          whileHover={{ scale: 1.1 }}
                          title="Primary"
                        />
                        <motion.div
                          className="h-8 rounded-md"
                          style={{ backgroundColor: `hsl(${colors.secondary})` }}
                          whileHover={{ scale: 1.1 }}
                          title="Secondary"
                        />
                        <motion.div
                          className="h-8 rounded-md"
                          style={{ backgroundColor: `hsl(${colors.accent})` }}
                          whileHover={{ scale: 1.1 }}
                          title="Accent"
                        />
                        <motion.div
                          className="h-8 rounded-md"
                          style={{ backgroundColor: `hsl(${colors.muted})` }}
                          whileHover={{ scale: 1.1 }}
                          title="Muted"
                        />
                        <motion.div
                          className="h-8 rounded-md border"
                          style={{ 
                            backgroundColor: `hsl(${colors.background})`,
                            borderColor: `hsl(${colors.border})`
                          }}
                          whileHover={{ scale: 1.1 }}
                          title="Background"
                        />
                      </div>
                      
                      {/* Mini Preview */}
                      <div 
                        className="rounded-md p-3 border"
                        style={{
                          backgroundColor: `hsl(${colors.background})`,
                          borderColor: `hsl(${colors.border})`,
                          color: `hsl(${colors.foreground})`
                        }}
                      >
                        <div 
                          className="text-xs font-medium mb-1"
                          style={{ color: `hsl(${colors.primary})` }}
                        >
                          Sample Card
                        </div>
                        <div className="text-xs" style={{ color: `hsl(${colors.mutedForeground})` }}>
                          This is how your interface will look
                        </div>
                        <div 
                          className="mt-2 px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: `hsl(${colors.primary})`,
                            color: `hsl(${colors.background})`
                          }}
                        >
                          Button
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Pro Tip</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your theme preference is automatically saved and will persist across sessions. 
              You can also quickly toggle between light and dark modes using the sun/moon button.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Theme Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <span className="text-lg">{moodThemes[currentTheme].emoji}</span>
            <span className="hidden sm:inline text-sm">{moodThemes[currentTheme].name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Quick Switch</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(moodThemes).map(([key, theme]) => (
            <DropdownMenuItem 
              key={key}
              onClick={() => handleThemeChange(key as MoodTheme)}
              className="flex items-center gap-2"
            >
              <span>{theme.emoji}</span>
              <span>{theme.name}</span>
              {currentTheme === key && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsOpen(true)} className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Browse All Themes</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}