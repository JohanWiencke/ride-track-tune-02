import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Dashboard from './Dashboard';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  console.log('Index component rendered:', { user: !!user, loading, currentPath: window.location.pathname });

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // Handle Strava OAuth callback
      if (code && state) {
        try {
          console.log('Processing Strava OAuth callback...');
          
          const { data, error } = await supabase.functions.invoke('strava-auth', {
            body: { code, state },
            headers: {
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          });

          if (error) {
            throw error;
          }

          toast({
            title: 'Strava Connected!',
            description: 'Your Strava account has been successfully connected.',
          });

          console.log('Strava connection successful:', data);
        } catch (error: any) {
          console.error('Error connecting Strava:', error);
          toast({
            title: 'Connection Failed',
            description: error.message || 'Failed to connect Strava account.',
            variant: 'destructive',
          });
        }

        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Handle OAuth errors
      else if (error) {
        toast({
          title: "Authorization Failed",
          description: "Authorization was cancelled or failed.",
          variant: "destructive",
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleOAuthCallback();
  }, [toast]);

  useEffect(() => {
    console.log('Index redirect useEffect triggered:', { user: !!user, loading });
    if (!loading && !user) {
      console.log('Redirecting to /auth');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return <Dashboard />;
};

export default Index;