import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Activity, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { StravaConnect } from '@/components/StravaConnect';

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

interface StravaActivity {
  strava_activity_id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date: string;
}

const Stats = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stravaConnected, setStravaConnected] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkStravaConnection = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('strava_access_token, strava_connected_at')
        .eq('user_id', user.id)
        .single();

      if (!error && data?.strava_access_token) {
        setStravaConnected(true);
        await fetchActivities();
      }
    } catch (error) {
      console.error('Error checking Strava connection:', error);
    }
  };

  const fetchActivities = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('strava_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      setActivities(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const calculateStats = (activities: StravaActivity[]) => {
    const currentYear = new Date().getFullYear();
    const ytdActivities = activities.filter(activity => 
      new Date(activity.start_date).getFullYear() === currentYear
    );

    const calculateTotals = (activityList: StravaActivity[]) => ({
      count: activityList.length,
      distance: activityList.reduce((sum, a) => sum + Number(a.distance), 0),
      moving_time: activityList.reduce((sum, a) => sum + Number(a.moving_time), 0),
      elevation_gain: activityList.reduce((sum, a) => sum + Number(a.total_elevation_gain), 0),
    });

    setStats({
      ytd_ride_totals: calculateTotals(ytdActivities),
      all_ride_totals: calculateTotals(activities),
    });
  };

  const handleStravaConnectionChange = () => {
    checkStravaConnection();
  };

  useEffect(() => {
    const initializeStats = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      await checkStravaConnection();
      setLoading(false);
    };

    initializeStats();
  }, [user, navigate]);

  const formatDistance = (distance: number): string => {
    return (distance / 1000).toFixed(1);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Performance Stats</h1>
        </div>

        {!stravaConnected ? (
          <StravaConnect 
            isConnected={stravaConnected} 
            onConnectionChange={handleStravaConnectionChange}
          />
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Year to Date Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Year to Date
                    </CardTitle>
                    <CardDescription>Your cycling progress this year</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Rides</span>
                        </div>
                        <p className="text-2xl font-bold">{stats.ytd_ride_totals.count}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Distance</span>
                        </div>
                        <p className="text-2xl font-bold">{formatDistance(stats.ytd_ride_totals.distance)} km</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Moving Time</span>
                        </div>
                        <p className="text-2xl font-bold">{formatTime(stats.ytd_ride_totals.moving_time)}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Elevation</span>
                        </div>
                        <p className="text-2xl font-bold">{Math.round(stats.ytd_ride_totals.elevation_gain)} m</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* All Time Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      All Time
                    </CardTitle>
                    <CardDescription>Your total cycling achievements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Rides</span>
                        </div>
                        <p className="text-2xl font-bold">{stats.all_ride_totals.count}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Distance</span>
                        </div>
                        <p className="text-2xl font-bold">{formatDistance(stats.all_ride_totals.distance)} km</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Moving Time</span>
                        </div>
                        <p className="text-2xl font-bold">{formatTime(stats.all_ride_totals.moving_time)}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Elevation</span>
                        </div>
                        <p className="text-2xl font-bold">{Math.round(stats.all_ride_totals.elevation_gain)} m</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Activities */}
            {activities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription>Your latest rides from Strava</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.slice(0, 10).map((activity) => (
                      <div key={activity.strava_activity_id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Activity className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{activity.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(activity.start_date).toLocaleDateString()} • {activity.type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatDistance(activity.distance)} km</p>
                          <p className="text-sm text-muted-foreground">{formatTime(activity.moving_time)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Stats;