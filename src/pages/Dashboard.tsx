import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Plus, Bike, Settings, AlertTriangle, CheckCircle, BarChart3, Package, Euro, Edit, Menu, User } from 'lucide-react';
import { AddBikeDialog } from '@/components/AddBikeDialog';
import { BikeComponentsDialog } from '@/components/BikeComponentsDialog';
import { EditBikeDialog } from '@/components/EditBikeDialog';
import { StravaConnect } from '@/components/StravaConnect';
import { TimeBasedGreeting } from '@/components/TimeBasedGreeting';
import { WearProgress } from '@/components/WearProgress';
import { InventoryWidget } from '@/components/InventoryWidget';
import { GarageValueWidget } from '@/components/GarageValueWidget';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { UserProfilePopup } from '@/components/UserProfilePopup';
import { useTranslation } from '@/hooks/useTranslation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GarageConditionWidget } from '@/components/GarageConditionWidget';

interface Bike {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  bike_type: string;
  year?: number;
  total_distance: number;
  weight?: number;
  price?: number;
  image_url?: string;
}

interface BikeComponent {
  id: string;
  bike_id: string;
  component_type: {
    name: string;
    default_replacement_distance: number;
  };
  replacement_distance: number;
  current_distance: number;
  is_active: boolean;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [components, setComponents] = useState<BikeComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBike, setShowAddBike] = useState(false);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  const [editingBike, setEditingBike] = useState<Bike | null>(null);
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [inventoryStats, setInventoryStats] = useState({ totalParts: 0, totalValue: 0 });
  const [stravaStats, setStravaStats] = useState({ totalDistance: 0, totalActivities: 0 });

  useEffect(() => {
    fetchBikes();
    fetchInventoryStats();
    fetchStravaStats();
    
    // Check if we're returning from Strava authorization
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('strava_connected') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      toast({
        title: "Connected!",
        description: "Your Strava account has been connected successfully.",
      });
    }
  }, []);

  // Separate effect to handle connection status updates
  useEffect(() => {
    const checkConnections = async () => {
      if (!user?.id) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('strava_access_token')
        .eq('user_id', user.id)
        .single();
      
      const stravaConnected = !!profile?.strava_access_token;
      
      setIsStravaConnected(stravaConnected);
    };

    // Check connection status every 2 seconds for 10 seconds after component mounts
    const interval = setInterval(checkConnections, 2000);
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    // Initial check
    checkConnections();

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [user?.id]);

  const fetchBikes = async () => {
    try {
      const { data: bikesData, error: bikesError } = await supabase
        .from('bikes')
        .select('*')
        .order('created_at', { ascending: false });

      if (bikesError) throw bikesError;

      setBikes(bikesData || []);

      // Fetch components for all bikes
      if (bikesData && bikesData.length > 0) {
        const { data: componentsData, error: componentsError } = await supabase
          .from('bike_components')
          .select(`
            *,
            component_type:component_types(name, default_replacement_distance)
          `)
          .in('bike_id', bikesData.map(bike => bike.id))
          .eq('is_active', true);

        if (componentsError) throw componentsError;
        setComponents(componentsData || []);
      }

    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryStats = async () => {
    if (!user?.id) return;

    try {
      const { data: inventoryData, error } = await supabase
        .from('parts_inventory')
        .select('quantity, purchase_price')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalParts = inventoryData?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalValue = inventoryData?.reduce((sum, item) => sum + ((item.purchase_price || 0) * item.quantity), 0) || 0;

      setInventoryStats({ totalParts, totalValue });
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    }
  };

  const fetchStravaStats = async () => {
    if (!user?.id) return;

    try {
      const { data: stravaData, error } = await supabase
        .from('strava_activities')
        .select('distance')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalActivities = stravaData?.length || 0;
      const totalDistance = stravaData?.reduce((sum, activity) => sum + (activity.distance || 0), 0) || 0;

      setStravaStats({ totalDistance, totalActivities });
    } catch (error) {
      console.error('Error fetching Strava stats:', error);
    }
  };

  const getComponentStatus = (component: BikeComponent) => {
    const usage = (component.current_distance / component.replacement_distance) * 100;
    if (usage >= 90) return { status: 'critical', color: 'destructive' };
    if (usage >= 70) return { status: 'warning', color: 'secondary' };
    return { status: 'good', color: 'default' };
  };

  const getBikeComponents = (bikeId: string) => {
    return components.filter(c => c.bike_id === bikeId);
  };

  const getComponentsNeedingAttention = () => {
    return components.filter(c => {
      const warningThreshold = Math.max(0, c.replacement_distance - 300); // 300km before max
      const warningUsage = (c.current_distance / warningThreshold) * 100;
      return warningUsage >= 100;
    });
  };

  const getTotalGarageValue = () => {
    return bikes.reduce((total, bike) => total + (bike.price || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your bikes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glass-blue/10 via-background to-glass-purple/10 animate-gradient">
      {/* Compact Header */}
      <header className="border-b glass-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/4ff90988-aa97-4e30-a9cc-2d87ae0687bd.png" alt="BMT" className="h-6 w-6" />
            <h1 className="text-lg font-semibold hidden sm:block">BikeMainTrack</h1>
            <h1 className="text-lg font-semibold sm:hidden">BikeMainTrack</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="glass-dropdown-trigger animate-smooth">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 glass-dropdown animate-smooth-dropdown">
                <DropdownMenuItem onClick={() => navigate('/profile')} className="glass-dropdown-item">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {isStravaConnected && (
                  <DropdownMenuItem onClick={() => navigate('/stats')} className="glass-dropdown-item">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('stats')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate('/parts-inventory')} className="glass-dropdown-item">
                  <Package className="h-4 w-4 mr-2" />
                  {t('inventory')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="glass-dropdown-item">
                  <Settings className="h-4 w-4 mr-2" />
                  {t('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container py-4 space-y-6">
        <TimeBasedGreeting />
        {/* Compact Layout: Strava + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Integration - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 grid grid-cols-1 gap-4">
            <StravaConnect 
              isConnected={isStravaConnected} 
              onConnectionChange={(connected) => {
                setIsStravaConnected(connected);
                if (connected) {
                  fetchBikes(); // Refresh data after connection
                }
              }}
              onSyncComplete={() => {
                fetchBikes(); // Refresh bikes after sync
              }}
            />
          </div>
          
          {/* Quick Stats - Takes 3 columns on large screens, stacks on smaller */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Enhanced Liquid Glass Bike Widget */}
              <div className="relative group animate-float">
                <div className="absolute inset-0 bg-gradient-to-br from-glass-blue/40 via-glass-purple/30 to-glass-blue/40 rounded-xl blur-2xl group-hover:blur-xl transition-all duration-700 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 rounded-xl border-2 border-white/30 shadow-2xl"></div>
                <Card className="relative bg-white/15 backdrop-blur-2xl hover:bg-white/20 transition-all duration-700 overflow-hidden border-0 shadow-[0_8px_40px_rgba(139,69,219,0.4)] hover:shadow-[0_12px_60px_rgba(139,69,219,0.6)] hover:transform hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 opacity-60"></div>
                  <CardContent className="relative p-4 z-10">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-glass-blue/50 to-glass-purple/50 rounded-xl blur-md animate-glow"></div>
                        <div className="relative p-3 bg-gradient-to-br from-glass-blue/40 to-glass-purple/30 rounded-xl backdrop-blur-sm border-2 border-white/40 shadow-xl">
                          <Bike className="h-5 w-5 text-white drop-shadow-2xl" />
                        </div>
                      </div>
                      <div>
                        <p className="text-3xl font-black bg-gradient-to-r from-white via-glass-blue to-glass-purple bg-clip-text text-transparent drop-shadow-lg">{bikes.length}</p>
                        <p className="text-sm text-white/90 font-semibold tracking-wide">Bikes Registered</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Enhanced Liquid Glass Components Widget */}
              <div className="relative group animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-glass-success/40 via-glass-primary/30 to-glass-success/40 rounded-xl blur-2xl group-hover:blur-xl transition-all duration-700 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 rounded-xl border-2 border-white/30 shadow-2xl"></div>
                <Card className="relative bg-white/15 backdrop-blur-2xl hover:bg-white/20 transition-all duration-700 overflow-hidden border-0 shadow-[0_8px_40px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_60px_rgba(16,185,129,0.6)] hover:transform hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 opacity-60"></div>
                  <CardContent className="relative p-4 z-10">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-glass-success/50 to-glass-primary/50 rounded-xl blur-md animate-glow"></div>
                        <div className="relative p-3 bg-gradient-to-br from-glass-success/40 to-glass-primary/30 rounded-xl backdrop-blur-sm border-2 border-white/40 shadow-xl">
                          <CheckCircle className="h-5 w-5 text-white drop-shadow-2xl" />
                        </div>
                      </div>
                      <div>
                        <p className="text-3xl font-black bg-gradient-to-r from-white via-glass-success to-glass-primary bg-clip-text text-transparent drop-shadow-lg">{components.length}</p>
                        <p className="text-sm text-white/90 font-semibold tracking-wide">Components Tracked</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Enhanced Liquid Glass Attention Widget */}
              <div className="relative group animate-float" style={{ animationDelay: '1s' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-glass-warning/40 via-red-500/30 to-glass-warning/40 rounded-xl blur-2xl group-hover:blur-xl transition-all duration-700 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 rounded-xl border-2 border-white/30 shadow-2xl"></div>
                <Card className="relative bg-white/15 backdrop-blur-2xl hover:bg-white/20 transition-all duration-700 overflow-hidden border-0 shadow-[0_8px_40px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_60px_rgba(251,146,60,0.6)] hover:transform hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 opacity-60"></div>
                  <CardContent className="relative p-4 z-10">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-glass-warning/50 to-red-500/50 rounded-xl blur-md animate-glow"></div>
                        <div className="relative p-3 bg-gradient-to-br from-glass-warning/40 to-red-500/30 rounded-xl backdrop-blur-sm border-2 border-white/40 shadow-xl">
                          <AlertTriangle className="h-5 w-5 text-white drop-shadow-2xl" />
                        </div>
                      </div>
                      <div>
                        <p className="text-3xl font-black bg-gradient-to-r from-white via-glass-warning to-red-400 bg-clip-text text-transparent drop-shadow-lg">{getComponentsNeedingAttention().length}</p>
                        <p className="text-sm text-white/90 font-semibold tracking-wide">Need Attention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Enhanced Liquid Glass Garage Value Widget */}
              <div className="relative group animate-float" style={{ animationDelay: '1.5s' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/40 via-blue-500/30 to-green-400/40 rounded-xl blur-2xl group-hover:blur-xl transition-all duration-700 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 rounded-xl border-2 border-white/30 shadow-2xl"></div>
                <Card className="relative bg-white/15 backdrop-blur-2xl hover:bg-white/20 transition-all duration-700 overflow-hidden border-0 shadow-[0_8px_40px_rgba(34,197,94,0.4)] hover:shadow-[0_12px_60px_rgba(34,197,94,0.6)] hover:transform hover:scale-105">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 opacity-60"></div>
                  <CardContent className="relative p-4 z-10">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-400/50 to-blue-500/50 rounded-xl blur-md animate-glow"></div>
                        <div className="relative p-3 bg-gradient-to-br from-green-400/40 to-blue-500/30 rounded-xl backdrop-blur-sm border-2 border-white/40 shadow-xl">
                          <Euro className="h-5 w-5 text-white drop-shadow-2xl" />
                        </div>
                      </div>
                      <div>
                        <p className="text-3xl font-black bg-gradient-to-r from-white via-green-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">€{getTotalGarageValue().toFixed(0)}</p>
                        <p className="text-sm text-white/90 font-semibold tracking-wide">Garage Value</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Widgets Section - Now with 3 widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t('partsInventory')}</h2>
            <InventoryWidget />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Garage Valuation</h2>
            <GarageValueWidget />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Garage Condition</h2>
            <GarageConditionWidget />
          </div>
        </div>

        {/* Bikes Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{t('myBikes')}</h2>
          <Button size="sm" onClick={() => setShowAddBike(true)} className="gap-1 glass-button">
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">{t('addBike')}</span>
            <span className="sm:hidden">{t('add')}</span>
          </Button>
        </div>

        {bikes.length === 0 ? (
          <Card className="glass-card p-8 text-center">
            <div className="animate-float">
              <Bike className="h-12 w-12 text-glass-primary mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No bikes registered yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Add your first bike to start tracking maintenance
            </p>
            <Button size="sm" onClick={() => setShowAddBike(true)} className="gap-1 glass-button">
              <Plus className="h-3 w-3" />
              Add Your First Bike
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bikes.map((bike) => {
              const bikeComponents = getBikeComponents(bike.id);
              const needsAttention = bikeComponents.filter(c => {
                const warningThreshold = Math.max(0, c.replacement_distance - 300);
                const warningUsage = (c.current_distance / warningThreshold) * 100;
                return warningUsage >= 100;
              }).length;

              return (
                <Card key={bike.id} className="glass-card hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20">
                  {bike.image_url && (
                    <div className="w-full h-32 overflow-hidden rounded-t-lg">
                      <img 
                        src={bike.image_url} 
                        alt={bike.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{bike.name}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingBike(bike)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          {t('edit')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBike(bike)}
                          className="gap-1"
                        >
                          <Settings className="h-3 w-3" />
                          {t('manageParts')}
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {bike.brand && bike.model && (
                        <p>{bike.brand} {bike.model}</p>
                      )}
                      <div className="flex gap-4">
                        {bike.weight && <span>Weight: {bike.weight}kg</span>}
                        {bike.price && <span>Value: €{bike.price.toFixed(0)}</span>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Total Distance</span>
                          <span className="font-medium">{bike.total_distance.toLocaleString()} km</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Components</span>
                          <span>{bikeComponents.length} tracked</span>
                        </div>
                        
                        {needsAttention > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {needsAttention} need attention
                          </Badge>
                        )}
                      </div>

                      {bikeComponents.slice(0, 3).map((component) => (
                        <WearProgress
                          key={component.id}
                          current={component.current_distance}
                          total={component.replacement_distance}
                          componentName={component.component_type.name}
                          className="bg-glass-bg/50 p-3 rounded-lg backdrop-blur-sm"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddBikeDialog 
        open={showAddBike} 
        onOpenChange={setShowAddBike}
        onBikeAdded={fetchBikes}
      />
      
      {selectedBike && (
        <BikeComponentsDialog
          bike={selectedBike}
          open={!!selectedBike}
          onOpenChange={(open) => !open && setSelectedBike(null)}
          onComponentsUpdated={fetchBikes}
        />
      )}

      {editingBike && (
        <EditBikeDialog
          bike={editingBike}
          open={!!editingBike}
          onOpenChange={(open) => !open && setEditingBike(null)}
          onBikeUpdated={fetchBikes}
        />
      )}
    </div>
  );
};

export default Dashboard;
