import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity, Calendar, MapPin, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface YearlyStats {
  total_distance: number;
  total_rides: number;
  total_elevation: number;
  total_time: number;
  biggest_ride_distance: number;
}

const Stats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<YearlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchYearlyStats();
    }
  }, [user]);

  const fetchYearlyStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('strava-stats', {
        body: { year: new Date().getFullYear() }
      });

      if (error) throw error;
      setStats(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch Strava stats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters: number) => {
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glass-blue/10 via-background to-glass-purple/10 animate-gradient p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Cycling Stats {new Date().getFullYear()}
            </h1>
            <p className="text-muted-foreground">Your year in cycling</p>
          </div>
        </div>

        {!stats ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <div className="animate-float mb-4">
                <Activity className="h-16 w-16 text-glass-primary mx-auto" />
              </div>
              <p className="text-muted-foreground mb-4">
                Connect to Strava to see your cycling statistics
              </p>
              <Button onClick={() => navigate('/')} className="glass-button">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="glass-card animate-glow hover:scale-105 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
                <div className="p-2 bg-gradient-to-br from-glass-blue/20 to-glass-primary/10 rounded-lg animate-float">
                  <MapPin className="h-4 w-4 text-glass-blue" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-gradient-to-r from-glass-blue to-glass-purple bg-clip-text text-transparent">
                  {formatDistance(stats.total_distance)}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card animate-glow hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
                <div className="p-2 bg-gradient-to-br from-glass-success/20 to-glass-success/10 rounded-lg animate-float" style={{ animationDelay: '0.5s' }}>
                  <Activity className="h-4 w-4 text-glass-success" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-gradient-to-r from-glass-success to-glass-primary bg-clip-text text-transparent">
                  {stats.total_rides}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card animate-glow hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Time</CardTitle>
                <div className="p-2 bg-gradient-to-br from-glass-accent/20 to-glass-accent/10 rounded-lg animate-float" style={{ animationDelay: '1s' }}>
                  <Timer className="h-4 w-4 text-glass-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-gradient-to-r from-glass-accent to-glass-blue bg-clip-text text-transparent">
                  {formatTime(stats.total_time)}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card animate-glow hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Elevation</CardTitle>
                <div className="p-2 bg-gradient-to-br from-glass-warning/20 to-glass-warning/10 rounded-lg animate-float" style={{ animationDelay: '1.5s' }}>
                  <Calendar className="h-4 w-4 text-glass-warning" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-gradient-to-r from-glass-warning to-orange-500 bg-clip-text text-transparent">
                  {stats.total_elevation.toLocaleString()} m
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card animate-glow hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.4s' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Biggest Ride</CardTitle>
                <div className="p-2 bg-gradient-to-br from-glass-purple/20 to-glass-purple/10 rounded-lg animate-float" style={{ animationDelay: '2s' }}>
                  <MapPin className="h-4 w-4 text-glass-purple" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-gradient-to-r from-glass-purple to-glass-indigo bg-clip-text text-transparent">
                  {formatDistance(stats.biggest_ride_distance)}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card animate-glow hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.5s' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Ride</CardTitle>
                <div className="p-2 bg-gradient-to-br from-glass-indigo/20 to-glass-indigo/10 rounded-lg animate-float" style={{ animationDelay: '2.5s' }}>
                  <Activity className="h-4 w-4 text-glass-indigo" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold bg-gradient-to-r from-glass-indigo to-glass-secondary bg-clip-text text-transparent">
                  {stats.total_rides > 0 
                    ? formatDistance(stats.total_distance / stats.total_rides)
                    : '0 km'
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stats;