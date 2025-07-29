import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
];

interface LanguageSwitcherProps {
  currentLanguage?: string;
  onLanguageChange?: (language: string) => void;
}

export const LanguageSwitcher = ({ 
  currentLanguage = 'en', 
  onLanguageChange 
}: LanguageSwitcherProps) => {
  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    onLanguageChange?.(langCode);
    // Store in localStorage for persistence
    localStorage.setItem('preferred-language', langCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLang.flag} {currentLang.name}</span>
          <span className="sm:hidden">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={currentLanguage === language.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};