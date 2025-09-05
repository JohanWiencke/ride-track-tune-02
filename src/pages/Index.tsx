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

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      // Check if this is a Strava callback
      if (code && state === 'strava') {
        try {
          const { data, error } = await supabase.functions.invoke('strava-auth', {
            body: { action: 'exchange_token', code }
          });

          if (error) throw error;

          toast({
            title: "Strava Connected!",
            description: `Connected as ${data.athlete.firstname} ${data.athlete.lastname}`,
          });
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: any) {
          toast({
            title: "Strava Connection Error",
            description: error.message || "Failed to complete Strava connection",
            variant: "destructive",
          });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
      
      // Check if this is a Wahoo callback  
      else if (code && state === 'wahoo') {
        try {
          const { data, error } = await supabase.functions.invoke('wahoo-auth', {
            body: { action: 'exchange_token', code }
          });

          if (error) throw error;

          toast({
            title: "Wahoo Connected!",
            description: "Your Wahoo account has been connected successfully.",
          });
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: any) {
          toast({
            title: "Wahoo Connection Error",
            description: error.message || "Failed to complete Wahoo connection",
            variant: "destructive",
          });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
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
      
      // Normal auth redirect for non-OAuth users
      else if (!loading && !user && !code) {
        navigate('/auth');
      }
    };

    handleOAuthCallback();
  }, [user, loading, navigate, toast]);

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
