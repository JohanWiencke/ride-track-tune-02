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
      return Link;
    }
    if (lowercaseName.includes('cassette') || lowercaseName.includes('sprocket')) {
      return Settings;
    }
    if (lowercaseName.includes('brake') || lowercaseName.includes('pad')) {
      return Disc;
    }
    if (lowercaseName.includes('cable') || lowercaseName.includes('housing')) {
      return Minus;
    }
    if (lowercaseName.includes('derailleur')) {
      return RotateCcw;
    }
    if (lowercaseName.includes('shifter')) {
      return ChevronUp;
    }
    if (lowercaseName.includes('tire') || lowercaseName.includes('tyre')) {
      return Circle;
    }
    if (lowercaseName.includes('tube')) {
      return Circle;
    }
    if (lowercaseName.includes('chainring')) {
      return Settings;
    }
    if (lowercaseName.includes('pedal')) {
      return Circle;
    }
    if (lowercaseName.includes('seat') || lowercaseName.includes('saddle')) {
      return Minus;
    }
    if (lowercaseName.includes('handlebar')) {
      return Minus;
    }
    if (lowercaseName.includes('stem')) {
      return Minus;
    }
    if (lowercaseName.includes('fork')) {
      return Minus;
    }
    if (lowercaseName.includes('shock')) {
      return Zap;
    }
    if (lowercaseName.includes('bearing')) {
      return Circle;
    }
    if (lowercaseName.includes('headset')) {
      return Circle;
    }
    if (lowercaseName.includes('bottom bracket')) {
      return Circle;
    }
    if (lowercaseName.includes('wheel')) {
      return Circle;
    }
    if (lowercaseName.includes('hub')) {
      return Circle;
    }
    if (lowercaseName.includes('spoke')) {
      return Minus;
    }
    if (lowercaseName.includes('rim')) {
      return Circle;
    }
    if (lowercaseName.includes('tape') || lowercaseName.includes('grip')) {
      return Minus;
    }
    if (lowercaseName.includes('computer') || lowercaseName.includes('gps')) {
      return Gauge;
    }
    
    // Default icon
    return Wrench;
  };

  const IconComponent = getIconForComponent(componentName);
  
  return <IconComponent className={className} />;
};