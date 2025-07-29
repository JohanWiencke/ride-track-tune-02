import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Unlink } from 'lucide-react';

interface WahooConnectProps {
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

export const WahooConnect = ({ isConnected, onConnectionChange }: WahooConnectProps) => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      console.log('Requesting Wahoo authorization URL...');
      
      const { data, error } = await supabase.functions.invoke('wahoo-auth', {
        body: { action: 'get_auth_url' }
      });

      if (error) {
        console.error('Failed to get auth URL:', error);
        throw error;
      }

      if (data?.auth_url) {
        console.log('Redirecting to Wahoo authorization...');
        window.location.href = data.auth_url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to Wahoo",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase.functions.invoke('wahoo-auth', {
        body: { action: 'disconnect' }
      });

      if (error) throw error;

      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Wahoo",
      });
      onConnectionChange(false);
    } catch (error: any) {
      toast({
        title: "Disconnection Error",
        description: error.message || "Failed to disconnect from Wahoo",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="glass-card animate-glow">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          Wahoo Fitness
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isConnected ? (
          <div className="space-y-3">
            <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
              Connected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="w-full gap-2"
            >
              <Unlink className="h-3 w-3" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Connect to sync workout data
            </p>
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full glass-button"
            >
              {isConnecting ? "Connecting..." : "Connect Wahoo"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
