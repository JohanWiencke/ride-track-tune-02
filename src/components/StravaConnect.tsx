
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StravaConnectProps {
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
  onSyncComplete?: () => void;
}

export function StravaConnect({ isConnected, onConnectionChange, onSyncComplete }: StravaConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const { toast } = useToast();
  const { user, loading } = useAuth();

  // Check connection status when component mounts and when user changes
  useEffect(() => {
    if (!loading) {
      checkStravaConnection();
    }
  }, [user, loading]);

  const checkStravaConnection = async () => {
    console.log('Checking Strava connection...', { user: !!user, userId: user?.id });
    
    if (!user) {
      console.log('No user found, setting disconnected');
      setConnectionStatus('disconnected');
      onConnectionChange(false);
      return;
    }

    try {
      console.log('Checking Strava connection for user:', user.id);
      
      // First, ensure user has a profile record
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('strava_access_token')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Profile check result:', { existingProfile, profileError });

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError);
        setConnectionStatus('disconnected');
        onConnectionChange(false);
        return;
      }

      // If no profile exists, create one
      if (!existingProfile) {
        console.log('No profile found, creating one...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            strava_access_token: null,
            strava_refresh_token: null,
            strava_athlete_id: null
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setConnectionStatus('disconnected');
          onConnectionChange(false);
          return;
        }
        
        setConnectionStatus('disconnected');
        onConnectionChange(false);
        return;
      }

      // Check if user has Strava token
      const hasStravaToken = !!existingProfile.strava_access_token;
      console.log('Strava token exists:', hasStravaToken);
      
      setConnectionStatus(hasStravaToken ? 'connected' : 'disconnected');
      onConnectionChange(hasStravaToken);
      
    } catch (error) {
      console.error('Error checking Strava connection:', error);
      setConnectionStatus('disconnected');
      onConnectionChange(false);
    }
  };

  const handleConnect = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to connect Strava.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Starting Strava connection...');
      
      // Get the Strava authorization URL from our edge function
      const { data, error } = await supabase.functions.invoke('strava-auth', {
        body: { action: 'get_auth_url' }
      });

      console.log('Auth URL response:', { data, error });

      if (error) throw error;

      // Open the auth URL in the same window
      console.log('Redirecting to Strava auth URL:', data.authUrl);
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to Strava",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    
    setIsDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('strava-auth', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      toast({
        title: "Strava Disconnected",
        description: "Your Strava account has been disconnected.",
      });
      
      setConnectionStatus('disconnected');
      onConnectionChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Strava",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      console.log('Starting Strava sync...');
      const { data, error } = await supabase.functions.invoke('strava-sync');

      console.log('Sync response:', { data, error });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: "Your Strava bikes and activities have been synced successfully.",
      });
      
      // Trigger refresh of bikes list
      onSyncComplete?.();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Error",
        description: error.message || "Failed to sync Strava activities",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading || connectionStatus === 'checking') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Checking Strava connection...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show sign-in message if user is not authenticated
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172"/>
            </svg>
            Strava Integration
          </CardTitle>
          <CardDescription>
            Please sign in to connect your Strava account and sync your bike garage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You need to be signed in to connect your Strava account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {connectionStatus === 'disconnected' ? (
        <>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172"/>
              </svg>
              Strava Integration
            </CardTitle>
            <CardDescription>
              Connect your Strava account to automatically sync your bike garage and cycling activities with distances.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect to Strava"}
            </Button>
          </CardContent>
        </>
      ) : (
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.172"/>
            </svg>
            <span className="font-medium">Strava</span>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Connected
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
              className="w-full"
            >
              {isSyncing ? "Syncing..." : "Sync Activities"}
            </Button>
            <Button 
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-destructive"
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
