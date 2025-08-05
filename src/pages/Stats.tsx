import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Calendar, MapPin, TrendingUp } from 'lucide-react';

interface StatsData {
  ytd_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elevation_gain: number;
  };
  all_ride_totals: {
    count: number;
    distance: number;
    moving_time: number;
    elevation_gain: number;
  };
}

const Stats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAndFetchStats = async () => {
      if (!user?.id) {
        navigate('/auth');
        return;
      }

      try {
        setLoading(true);
        
        // For now, show a message that stats will be available when Strava is connected
        toast({
          title: "Stats Coming Soon",
          description: "Connect your Strava account to view detailed cycling statistics.",
        });
        navigate('/');
        return;
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Failed to load statistics.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAndFetchStats();
  }, [user, navigate, toast]);

  const formatDistance = (distance: number) => {
    return (distance / 1000).toFixed(1);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glass-blue/10 via-background to-glass-purple/10">
      <div className="container py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Cycling Statistics</h1>
        </div>

        {!stats && (
          <Card className="glass-card p-8 text-center">
            <Activity className="h-12 w-12 text-glass-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Statistics Available</h2>
            <p className="text-muted-foreground mb-4">
              Connect your Strava account to view detailed cycling statistics and track your progress.
            </p>
            <Button onClick={() => navigate('/')}>
              Return to Dashboard
            </Button>
          </Card>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Year to Date Stats */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Year to Date ({new Date().getFullYear()})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {stats.ytd_ride_totals.count}
                    </div>
                    <div className="text-sm text-muted-foreground">Rides</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatDistance(stats.ytd_ride_totals.distance)} km
                    </div>
                    <div className="text-sm text-muted-foreground">Distance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatTime(stats.ytd_ride_totals.moving_time)}
                    </div>
                    <div className="text-sm text-muted-foreground">Moving Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {stats.ytd_ride_totals.elevation_gain.toLocaleString()} m
                    </div>
                    <div className="text-sm text-muted-foreground">Elevation</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* All Time Stats */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  All Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {stats.all_ride_totals.count}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Rides</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatDistance(stats.all_ride_totals.distance)} km
                    </div>
                    <div className="text-sm text-muted-foreground">Total Distance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatTime(stats.all_ride_totals.moving_time)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {stats.all_ride_totals.elevation_gain.toLocaleString()} m
                    </div>
                    <div className="text-sm text-muted-foreground">Total Elevation</div>
                  </div>
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