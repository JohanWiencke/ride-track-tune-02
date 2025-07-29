import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const WahooCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleWahooCallback = async () => {
      console.log('WahooCallback component mounted, processing callback...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      console.log('Callback params - code:', !!code, 'error:', error, 'user:', !!user);

      if (error) {
        let errorMessage = "Wahoo authorization failed.";
        
        switch (error) {
          case 'access_denied':
            errorMessage = "You denied access to Wahoo.";
            break;
          case 'invalid_state':
            errorMessage = "Invalid authentication state.";
            break;
          case 'no_code':
            errorMessage = "No authorization code received.";
            break;
          case 'callback_error':
            errorMessage = "An error occurred during the callback process.";
            break;
        }

        toast({
          title: "Authorization Failed",
          description: errorMessage,
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      if (!code) {
        console.error('No authorization code found in URL');
        toast({
          title: "Authorization Failed",
          description: "No authorization code received from Wahoo.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      if (!user) {
        console.error('User not authenticated');
        toast({
          title: "Authentication Required",
          description: "Please log in to connect your Wahoo account.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      try {
        console.log('Exchanging authorization code for tokens...');
        
        const { data, error: exchangeError } = await supabase.functions.invoke('wahoo-auth', {
          body: {
            action: 'exchange_token',
            code: code,
          },
        });

        if (exchangeError) {
          console.error('Exchange error:', exchangeError);
          throw exchangeError;
        }

        if (!data || !data.success) {
          throw new Error('Token exchange failed');
        }

        console.log('Wahoo connection successful');
        
        toast({
          title: "Success!",
          description: "Your Wahoo account has been connected successfully.",
        });

        // Redirect to dashboard with success parameter
        navigate('/dashboard?wahoo_connected=true');
      } catch (error: any) {
        console.error('Wahoo callback error:', error);
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect to Wahoo. Please try again.",
          variant: "destructive",
        });
        navigate('/dashboard');
      }
    };

    handleWahooCallback();
  }, [user, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Connecting to Wahoo...</p>
      </div>
    </div>
  );
};

export default WahooCallback;