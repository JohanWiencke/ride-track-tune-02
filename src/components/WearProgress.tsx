import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface WearProgressProps {
  current: number;
  total: number;
  componentName: string;
  className?: string;
}

export function WearProgress({ current, total, componentName, className }: WearProgressProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const percentage = Math.min((current / total) * 100, 100);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [percentage]);

  const getStatusColor = () => {
    if (percentage >= 90) return 'from-red-400 to-red-600';
    if (percentage >= 70) return 'from-orange-400 to-orange-600';
    if (percentage >= 50) return 'from-yellow-400 to-yellow-600';
    return 'from-glass-secondary to-glass-primary';
  };

  const getGlowColor = () => {
    if (percentage >= 90) return 'shadow-red-500/50';
    if (percentage >= 70) return 'shadow-orange-500/50';
    if (percentage >= 50) return 'shadow-yellow-500/50';
    return 'shadow-glass-primary/50';
  };

  const getIconColor = () => {
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 70) return 'text-orange-400';
    if (percentage >= 50) return 'text-yellow-400';
    return 'text-glass-primary';
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Component Info */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            percentage >= 90 ? "bg-red-400" : 
            percentage >= 70 ? "bg-orange-400" :
            percentage >= 50 ? "bg-yellow-400" : "bg-glass-primary"
          )} />
          <span className="text-sm font-medium text-foreground">{componentName}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {current.toLocaleString()} / {total.toLocaleString()} km
        </span>
      </div>

      {/* Animated Progress Ring */}
      <div className="relative flex items-center justify-center">
        <div className="relative w-24 h-24">
          {/* Background Ring */}
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="hsl(var(--border))"
              strokeWidth="8"
              fill="none"
              className="opacity-20"
            />
            {/* Animated Progress Ring */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - animatedPercentage / 100)}`}
              className={cn(
                "transition-all duration-1000 ease-out drop-shadow-lg",
                getGlowColor()
              )}
              style={{
                filter: `drop-shadow(0 0 8px currentColor)`,
              }}
            />
            {/* Gradient Definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={getStatusColor().split(' ')[0].replace('from-', 'stop-')} />
                <stop offset="100%" className={getStatusColor().split(' ')[1].replace('to-', 'stop-')} />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center Percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={cn(
                "text-lg font-bold transition-colors duration-300",
                getIconColor()
              )}>
                {Math.round(animatedPercentage)}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Wear
              </div>
            </div>
          </div>
        </div>

        {/* Floating Particles for High Wear */}
        {percentage >= 80 && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-1 h-1 rounded-full animate-ping",
                  percentage >= 90 ? "bg-red-400" : "bg-orange-400"
                )}
                style={{
                  left: `${20 + i * 25}%`,
                  top: `${20 + i * 20}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Condition</span>
          <span className={cn(
            "font-medium",
            percentage >= 90 ? "text-red-400" :
            percentage >= 70 ? "text-orange-400" :
            percentage >= 50 ? "text-yellow-400" : "text-glass-primary"
          )}>
            {percentage >= 90 ? "Critical" :
             percentage >= 70 ? "Replace Soon" :
             percentage >= 50 ? "Good" : "Excellent"}
          </span>
        </div>
        
        {/* Linear Progress Bar */}
        <div className="h-2 bg-border/20 rounded-full overflow-hidden backdrop-blur-sm">
          <div
            className={cn(
              "h-full bg-gradient-to-r transition-all duration-1000 ease-out rounded-full",
              getStatusColor(),
              "animate-pulse"
            )}
            style={{ width: `${animatedPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}