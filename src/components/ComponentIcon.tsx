
import { 
  Link, 
  Disc, 
  Settings, 
  Zap, 
  Minus, 
  Circle, 
  Wrench,
  RotateCcw,
  ChevronUp,
  Bike,
  Gauge
} from 'lucide-react';

interface ComponentIconProps {
  componentName: string;
  className?: string;
}

export const ComponentIcon = ({ componentName, className = "h-4 w-4" }: ComponentIconProps) => {
  const getIconForComponent = (name: string) => {
    const lowercaseName = name.toLowerCase();
    
    if (lowercaseName.includes('chain')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="6" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="18" cy="6" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="6" cy="18" r="3" fill="currentColor" opacity="0.3"/>
          <circle cx="18" cy="18" r="3" fill="currentColor" opacity="0.3"/>
          <path d="M9 6h6M9 18h6M6 9v6M18 9v6" strokeLinecap="round"/>
        </svg>
      );
    }
    if (lowercaseName.includes('cassette') || lowercaseName.includes('sprocket')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
          <circle cx="12" cy="12" r="7" fill="currentColor" opacity="0.2"/>
          <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      );
    }
    if (lowercaseName.includes('brake') || lowercaseName.includes('pad')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
          <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.1"/>
          <path d="M8 8l8 8M16 8l-8 8" strokeWidth="3" opacity="0.6"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      );
    }
    if (lowercaseName.includes('cable') || lowercaseName.includes('housing')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18" strokeWidth="4" opacity="0.3"/>
          <path d="M3 12h18" strokeWidth="2"/>
          <circle cx="3" cy="12" r="2" fill="currentColor"/>
          <circle cx="21" cy="12" r="2" fill="currentColor"/>
          <path d="M7 10v4M11 10v4M15 10v4M19 10v4" opacity="0.5"/>
        </svg>
      );
    }
    if (lowercaseName.includes('derailleur')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="6" rx="2" fill="currentColor" opacity="0.2"/>
          <rect x="6" y="12" width="4" height="8" rx="1" fill="currentColor" opacity="0.3"/>
          <circle cx="16" cy="16" r="4" fill="none" strokeWidth="2"/>
          <circle cx="16" cy="16" r="2" fill="currentColor" opacity="0.4"/>
          <path d="M8 10v2M12 6v4"/>
        </svg>
      );
    }
    if (lowercaseName.includes('shifter')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="4" width="12" height="8" rx="3" fill="currentColor" opacity="0.2"/>
          <circle cx="10" cy="8" r="2" fill="currentColor" opacity="0.4"/>
          <circle cx="14" cy="8" r="2" fill="currentColor" opacity="0.4"/>
          <path d="M6 12v4c0 2 1 3 3 3h6c2 0 3-1 3-3v-4"/>
          <path d="M12 12v4" strokeWidth="3" opacity="0.6"/>
        </svg>
      );
    }
    if (lowercaseName.includes('tire') || lowercaseName.includes('tyre')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1"/>
          <circle cx="12" cy="12" r="6" fill="none" strokeWidth="3"/>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3"/>
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeWidth="1" opacity="0.5"/>
          <path d="M6.34 6.34l1.41 1.41M16.25 16.25l1.41 1.41M6.34 17.66l1.41-1.41M16.25 7.75l1.41-1.41" strokeWidth="1" opacity="0.5"/>
        </svg>
      );
    }
    if (lowercaseName.includes('wheel')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
          <path d="M12 2v20M2 12h20" strokeWidth="1" opacity="0.4"/>
          <path d="M6.34 6.34l11.32 11.32M6.34 17.66L17.66 6.34" strokeWidth="1" opacity="0.4"/>
          <circle cx="12" cy="12" r="6" fill="none" strokeWidth="1" opacity="0.6"/>
        </svg>
      );
    }
    if (lowercaseName.includes('pedal')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="8" width="16" height="8" rx="2" fill="currentColor" opacity="0.2"/>
          <rect x="6" y="10" width="12" height="4" rx="1" fill="currentColor" opacity="0.3"/>
          <circle cx="8" cy="12" r="1" fill="currentColor"/>
          <circle cx="16" cy="12" r="1" fill="currentColor"/>
          <path d="M2 12h4M18 12h4" strokeWidth="3"/>
        </svg>
      );
    }
    if (lowercaseName.includes('seat') || lowercaseName.includes('saddle')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12c0-2 2-4 8-4s8 2 8 4" fill="currentColor" opacity="0.3"/>
          <path d="M4 12c0-2 2-4 8-4s8 2 8 4" strokeWidth="2"/>
          <path d="M12 16v6" strokeWidth="3"/>
          <circle cx="12" cy="22" r="1" fill="currentColor"/>
        </svg>
      );
    }
    if (lowercaseName.includes('handlebar')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12c2-4 4-6 9-6s7 2 9 6" strokeWidth="3" fill="none"/>
          <circle cx="3" cy="12" r="2" fill="currentColor" opacity="0.6"/>
          <circle cx="21" cy="12" r="2" fill="currentColor" opacity="0.6"/>
          <rect x="11" y="4" width="2" height="8" fill="currentColor" opacity="0.4"/>
        </svg>
      );
    }
    if (lowercaseName.includes('fork')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="11" y="2" width="2" height="12" fill="currentColor" opacity="0.3"/>
          <rect x="8" y="14" width="2" height="8" fill="currentColor" opacity="0.4"/>
          <rect x="14" y="14" width="2" height="8" fill="currentColor" opacity="0.4"/>
          <circle cx="9" cy="22" r="1" fill="currentColor"/>
          <circle cx="15" cy="22" r="1" fill="currentColor"/>
          <path d="M12 2v12M12 14l-3 0M12 14l3 0"/>
        </svg>
      );
    }
    if (lowercaseName.includes('shock')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="10" y="4" width="4" height="16" rx="2" fill="currentColor" opacity="0.2"/>
          <rect x="11" y="6" width="2" height="4" fill="currentColor" opacity="0.6"/>
          <rect x="11" y="14" width="2" height="4" fill="currentColor" opacity="0.6"/>
          <path d="M8 4h8M8 20h8" strokeWidth="1"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
          <path d="M6 12h4M14 12h4" strokeWidth="1" opacity="0.5"/>
        </svg>
      );
    }
    if (lowercaseName.includes('bearing') || lowercaseName.includes('headset') || lowercaseName.includes('bottom bracket')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.1"/>
          <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.2"/>
          <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.4"/>
          <circle cx="8" cy="8" r="1" fill="currentColor"/>
          <circle cx="16" cy="8" r="1" fill="currentColor"/>
          <circle cx="8" cy="16" r="1" fill="currentColor"/>
          <circle cx="16" cy="16" r="1" fill="currentColor"/>
        </svg>
      );
    }
    if (lowercaseName.includes('hub')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.2"/>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
          <path d="M12 6v12M6 12h12" strokeWidth="2" opacity="0.6"/>
          <path d="M8.46 8.46l7.08 7.08M8.46 15.54l7.08-7.08" strokeWidth="1" opacity="0.4"/>
        </svg>
      );
    }
    if (lowercaseName.includes('chainring')) {
      return () => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.1"/>
          <circle cx="12" cy="12" r="6" fill="none" strokeWidth="2"/>
          <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.4"/>
          <rect x="11" y="3" width="2" height="4" fill="currentColor" opacity="0.6"/>
          <rect x="11" y="17" width="2" height="4" fill="currentColor" opacity="0.6"/>
          <rect x="3" y="11" width="4" height="2" fill="currentColor" opacity="0.6"/>
          <rect x="17" y="11" width="4" height="2" fill="currentColor" opacity="0.6"/>
        </svg>
      );
    }
    
    // Default enhanced wrench icon
    return () => (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="currentColor" opacity="0.2"/>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    );
  };

  const IconComponent = getIconForComponent(componentName);
  
  return <IconComponent />;
};
