
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Calendar, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  user_id: string;
  strava_access_token: string | null;
  strava_refresh_token: string | null;
  strava_athlete_id: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  id?: string;
}

interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  created_at: string;
}

export function UserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stravaAthlete, setStravaAthlete] = useState<StravaAthlete | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        setProfile(profileData);

        // If user has Strava connected, fetch athlete info
        if (profileData.strava_access_token) {
          await fetchStravaAthlete();
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStravaAthlete = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('strava-athlete-info');

      if (error) {
        console.error('Error fetching Strava athlete:', error);
        return;
      }

      if (data?.athlete) {
        setStravaAthlete(data.athlete);
      }
    } catch (error) {
      console.error('Error fetching Strava athlete info:', error);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={stravaAthlete?.profile} />
            <AvatarFallback>
              {user.user_metadata?.full_name 
                ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                : user.email?.charAt(0).toUpperCase() || 'U'
              }
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">
              {user.user_metadata?.full_name || stravaAthlete?.firstname + ' ' + stravaAthlete?.lastname || 'User'}
            </h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Strava Connection Status */}
        <div className="space-y-3">
          <h4 className="font-medium">Connected Accounts</h4>
          
          {profile?.strava_access_token ? (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172"/>
                </svg>
                <div>
                  <p className="font-medium">Strava</p>
                  {stravaAthlete && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Connected as {stravaAthlete.firstname} {stravaAthlete.lastname}</p>
                      {stravaAthlete.city && stravaAthlete.country && (
                        <p>{stravaAthlete.city}, {stravaAthlete.country}</p>
                      )}
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Strava member since {new Date(stravaAthlete.created_at).getFullYear()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                <Activity className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172"/>
                </svg>
                <div>
                  <p className="font-medium">Strava</p>
                  <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
              </div>
              <Badge variant="secondary">
                Not Connected
              </Badge>
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="space-y-3">
          <h4 className="font-medium">Account Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since:</span>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last sign in:</span>
              <span>{new Date(user.last_sign_in_at || user.created_at).toLocaleDateString()}</span>
            </div>
            {profile?.strava_athlete_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Strava ID:</span>
                <span>{profile.strava_athlete_id}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
