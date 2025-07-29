import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StravaConnectProps {
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

export function StravaConnect({ isConnected, onConnectionChange }: StravaConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Get the Strava authorization URL from our edge function
      const { data, error } = await supabase.functions.invoke('strava-auth', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;

      // Open the auth URL in the same window
      window.location.href = data.authUrl;
    } catch (error: any) {
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to Strava",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
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
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('strava-sync');

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: "Your Strava activities have been synced successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Sync Error",
        description: error.message || "Failed to sync Strava activities",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

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
          Connect your Strava account to automatically sync cycling activities and update bike distances.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? "Connecting..." : "Connect to Strava"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Connected to Strava
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                className="flex-1"
              >
                {isSyncing ? "Syncing..." : "Sync Activities"}
              </Button>
              <Button 
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                variant="destructive"
                className="flex-1"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}