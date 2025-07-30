import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const StravaCallback = () => {
  const { user, refreshUser } = useAuth();  // Added refreshUser function to reload user data
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Run only if user is fully loaded
    if (!user) return;

    const handleStravaCallback = async () => {
      console.log('StravaCallback: Starting callback handling');
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      console.log('StravaCallback: URL params', { code: !!code, error });

      if (error) {
        console.log('StravaCallback: Error in URL params', error);
        toast({
          title: "Strava Connection Failed",
          description: "Authorization was denied or cancelled.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      if (code) {
        console.log('StravaCallback: Found code, exchanging token');
        try {
          const { data, error } = await supabase.functions.invoke('strava-auth', {
            body: { action: 'exchange_code', code }
          });

          console.log('StravaCallback: Token exchange response', { data, error });

          if (error) throw error;
          if (!data.success) throw new Error(data.error || 'Unknown error');

          const athleteName = data.athlete
            ? `${data.athlete.firstname} ${data.athlete.lastname}`
            : 'your Strava account';

          toast({
            title: "Strava Connected!",
            description: `Connected as ${athleteName}. Syncing your data...`,
          });

          // Refresh user profile to reflect new tokens
          await refreshUser();

          try {
            console.log('StravaCallback: Starting automatic sync...');
            const { data: syncData, error: syncError } = await supabase.functions.invoke('strava-sync');
            
            if (syncError) {
              console.warn('StravaCallback: Sync failed, but connection was successful', syncError);
              toast({
                title: "Sync Warning",
                description: "Connection successful, but sync failed. You can manually sync later.",
                variant: "default",
              });
            } else {
              console.log('StravaCallback: Automatic sync successful');
              toast({
                title: "Sync Complete",
                description: "Your Strava bikes and activities have been synced!",
              });
            }
          } catch (syncError) {
            console.warn('StravaCallback: Auto-sync failed:', syncError);
          }

          navigate('/?strava_connected=true');
          return;
        } catch (error: any) {
          console.error('StravaCallback: Error during token exchange', error);
          toast({
            title: "Connection Error",
            description: error.message || "Failed to complete Strava connection",
            variant: "destructive",
          });
        }
      } else {
        console.log('StravaCallback: Missing code', { code: !!code });
        toast({
          title: "Authentication Required",
          description: "Please sign in to connect Strava.",
          variant: "destructive",
        });
      }

      navigate('/');
    };

    handleStravaCallback();
  }, [user, toast, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Connecting to Strava...</p>
      </div>
    </div>
  );
};

export default StravaCallback;
