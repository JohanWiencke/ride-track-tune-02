import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StravaStats {
  total_distance: number;
  total_rides: number;
  total_elevation: number;
  total_time?: number;
  biggest_ride_distance?: number;
  recent_activities?: Array<{
    name: string;
    distance: number;
    moving_time: number;
    total_elevation_gain: number;
    start_date: string;
  }>;
}

const Stats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stravaStats, setStravaStats] = useState<StravaStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      if (!user?.id) return;

      // Check if user has Strava connected
      const { data: profile } = await supabase
        .from('profiles')
        .select('strava_access_token')
        .eq('user_id', user.id)
        .single();

      if (!profile?.strava_access_token) {
        toast({
          title: "No Strava Connection",
          description: "Please connect your Strava account to view stats.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Fetch stats from Strava API
      const { data, error } = await supabase.functions.invoke('strava-stats', {
        body: { year: new Date().getFullYear() }
      });

      if (error) {
        console.error('Strava stats error:', error);
        throw error;
      }
      
      if (data) {
        setStravaStats(data);
      }

    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error fetching stats",
        description: "Unable to load your cycling stats. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your cycling stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glass-blue/10 via-background to-glass-purple/10">
      <header className="border-b glass-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src="/lovable-uploads/0bcdc662-0aa0-4fc2-97c0-2ca4dae55f49.png" alt="BMT" className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Cycling Stats</h1>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {!stravaStats ? (
          <Card className="glass-card p-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Stats Not Available</h3>
            <p className="text-muted-foreground mb-4">
              Your cycling stats will appear here once your Strava connection is working properly.
            </p>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{(stravaStats.total_distance / 1000).toFixed(0)} km</p>
                      <p className="text-sm text-muted-foreground">Total Distance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stravaStats.total_rides}</p>
                      <p className="text-sm text-muted-foreground">Total Rides</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stravaStats.total_elevation.toLocaleString()} m</p>
                      <p className="text-sm text-muted-foreground">Total Elevation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!stravaStats.recent_activities || stravaStats.recent_activities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Recent activities data not available.</p>
                ) : (
                  <div className="space-y-4">
                    {stravaStats.recent_activities.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{activity.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(activity.start_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{(activity.distance / 1000).toFixed(1)} km</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(activity.moving_time)} • {activity.total_elevation_gain}m elevation
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Stats;