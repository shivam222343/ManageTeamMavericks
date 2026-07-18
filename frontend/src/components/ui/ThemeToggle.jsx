import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 cursor-pointer flex items-center justify-center transition-colors duration-200"
      title="Toggle dark/light theme"
    >
      {theme === 'dark' ? (
        <Sun size={20} className="text-amber-500" />
      ) : (
        <Moon size={20} className="text-primary-blue" />
      )}
    </motion.button>
  );
};

export default ThemeToggle;
