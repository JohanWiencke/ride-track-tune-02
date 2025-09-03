import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Activity } from 'lucide-react';

interface StravaConnectProps {
  isConnected: boolean;
  onConnectionChange: () => void;
}

export const StravaConnect = ({ isConnected, onConnectionChange }: StravaConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const connectToStrava = async () => {
    try {
      setIsConnecting(true);

      // Strava OAuth configuration
      const clientId = '139830'; // This should be your actual Strava client ID
      const redirectUri = encodeURIComponent(`${window.location.origin}/`);
      const scope = 'read,activity:read_all';
      const responseType = 'code';
      const state = Math.random().toString(36).substring(7);

      // Redirect to Strava OAuth
      const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=${responseType}&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}&state=${state}`;
      
      window.location.href = stravaAuthUrl;
    } catch (error) {
      console.error('Error connecting to Strava:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to connect to Strava. Please try again.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  const syncActivities = async () => {
    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke('strava-sync', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Sync Successful',
        description: `${data.activities_synced} activities synced from Strava!`,
      });

      onConnectionChange();
    } catch (error: any) {
      console.error('Error syncing activities:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync activities. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Strava Integration
        </CardTitle>
        <CardDescription>
          Connect your Strava account to sync your cycling activities and view detailed stats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <Button 
            onClick={connectToStrava} 
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect to Strava'
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              ✅ Strava account connected successfully!
            </p>
            <Button 
              onClick={syncActivities} 
              disabled={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing Activities...
                </>
              ) : (
                'Sync Activities'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};