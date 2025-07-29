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
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        toast({
          title: "Authorization Failed",
          description: "Wahoo authorization was cancelled or failed.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      if (code && user) {
        try {
          const { data, error: exchangeError } = await supabase.functions.invoke('wahoo-auth', {
            body: {
              action: 'exchange_token',
              code: code,
            },
          });

          if (exchangeError) throw exchangeError;

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
      } else {
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