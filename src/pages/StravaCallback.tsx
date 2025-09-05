import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const StravaCallback = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
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

      if (code && user) {
        console.log('StravaCallback: Found code and user, exchanging token');
        try {
          const { data, error } = await supabase.functions.invoke('strava-auth', {
            body: { action: 'exchange_token', code }
          });

          console.log('StravaCallback: Token exchange response', { data, error });

          if (error) throw error;

          console.log('StravaCallback: Success, showing toast');
          toast({
            title: "Strava Connected!",
            description: `Connected as ${data.athlete.firstname} ${data.athlete.lastname}`,
          });
          
          // Navigate back with success parameter
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
        console.log('StravaCallback: Missing code or user', { code: !!code, user: !!user });
      }

      console.log('StravaCallback: Navigating back to home');
      navigate('/');
    };

    handleStravaCallback();
  }, [user, toast, navigate]);

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