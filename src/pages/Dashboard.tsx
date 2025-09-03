import { useState, useEffect } from "react";
import { Plus, Activity, FileText, TrendingUp, Settings, CreditCard, Package, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AddBikeDialog } from "@/components/AddBikeDialog";
import { EditBikeDialog } from "@/components/EditBikeDialog";
import { BikeComponentsDialog } from "@/components/BikeComponentsDialog";
import { UserProfilePopup } from "@/components/UserProfilePopup";
import { TimeBasedGreeting } from "@/components/TimeBasedGreeting";
import { GarageValueWidget } from "@/components/GarageValueWidget";
import { GarageConditionWidget } from "@/components/GarageConditionWidget";
import { InventoryWidget } from "@/components/InventoryWidget";
import { StravaConnect } from "@/components/StravaConnect";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";

interface Bike {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  year?: number;
  bike_type: string;
  total_distance: number;
  weight?: number;
  price?: number;
  purchase_date?: string;
  estimated_value?: number;
  last_valuation_date?: string;
  valuation_source?: string;
  image_url?: string;
  component_details?: string;
}

const Dashboard = () => {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isComponentsDialogOpen, setIsComponentsDialogOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stravaConnected, setStravaConnected] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchBikes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bikes:', error);
        toast({
          title: "Error",
          description: "Failed to load your bikes",
          variant: "destructive",
        });
        return;
      }

      setBikes(data || []);
    } catch (error) {
      console.error('Error fetching bikes:', error);
      toast({
        title: "Error",
        description: "Failed to load your bikes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkStravaConnection = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('strava_access_token, strava_connected_at')
        .eq('user_id', user.id)
        .single();

      if (!error && data?.strava_access_token) {
        setStravaConnected(true);
      }
    } catch (error) {
      console.error('Error checking Strava connection:', error);
    }
  };

  useEffect(() => {
    fetchBikes();
    checkStravaConnection();
  }, [user]);

  const handleBikeAdded = () => {
    setIsAddDialogOpen(false);
    fetchBikes();
    toast({
      title: "Success",
      description: "Bike added successfully!",
    });
  };

  const handleBikeUpdated = () => {
    setIsEditDialogOpen(false);
    setSelectedBike(null);
    fetchBikes();
    toast({
      title: "Success",
      description: "Bike updated successfully!",
    });
  };

  const handleEditBike = (bike: Bike) => {
    setSelectedBike(bike);
    setIsEditDialogOpen(true);
  };

  const handleManageComponents = (bike: Bike) => {
    setSelectedBike(bike);
    setIsComponentsDialogOpen(true);
  };

  const handleStravaConnectionChange = () => {
    checkStravaConnection();
  };

  const getConditionColor = (condition: number) => {
    if (condition >= 80) return "bg-green-500";
    if (condition >= 60) return "bg-yellow-500";
    if (condition >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getConditionText = (condition: number) => {
    if (condition >= 80) return "Excellent";
    if (condition >= 60) return "Good";
    if (condition >= 40) return "Fair";
    return "Poor";
  };

  const mockCondition = (bikeIndex: number) => {
    const conditions = [85, 72, 58, 91, 45];
    return conditions[bikeIndex % conditions.length] || 75;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <TimeBasedGreeting />
            <p className="text-muted-foreground">Manage your cycling fleet and track performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsProfileOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bike
            </Button>
          </div>
        </div>

        {/* Strava Connection */}
        <StravaConnect 
          isConnected={stravaConnected} 
          onConnectionChange={handleStravaConnectionChange}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GarageValueWidget />
          <GarageConditionWidget />
          <InventoryWidget />
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/stats')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stravaConnected ? 'View Stats' : 'Connect Strava'}
              </div>
              <p className="text-xs text-muted-foreground">
                View cycling stats
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/parts-inventory')}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Package className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">Parts Inventory</span>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/spending-overview')}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <CreditCard className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">Spending Overview</span>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/stats')}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <BarChart3 className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">Performance Stats</span>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <FileText className="h-8 w-8 mb-2 text-primary" />
              <span className="text-sm font-medium">Maintenance Log</span>
            </CardContent>
          </Card>
        </div>

        {/* Bikes Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Bikes</h2>
          {bikes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">No bikes yet</h3>
                    <p className="text-muted-foreground">Add your first bike to get started tracking your cycling fleet</p>
                  </div>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Bike
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bikes.map((bike, index) => {
                const condition = mockCondition(index);
                return (
                  <Card key={bike.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 relative">
                      {bike.image_url ? (
                        <img 
                          src={bike.image_url} 
                          alt={bike.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Activity className="h-16 w-16 text-primary/50" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="capitalize">
                          {bike.bike_type}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{bike.name}</CardTitle>
                          <CardDescription>
                            {bike.brand && bike.model ? `${bike.brand} ${bike.model}` : bike.brand || 'Custom Build'}
                            {bike.year && ` (${bike.year})`}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getConditionColor(condition)}`}></div>
                          <span className="text-xs text-muted-foreground">{getConditionText(condition)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Distance</p>
                          <p className="font-medium">{(bike.total_distance / 1000).toFixed(0)} km</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Value</p>
                          <p className="font-medium">
                            {bike.estimated_value 
                              ? `$${bike.estimated_value.toLocaleString()}` 
                              : bike.price 
                                ? `$${bike.price.toLocaleString()}`
                                : 'N/A'
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditBike(bike)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleManageComponents(bike)}
                        >
                          Components
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Footer />
      </div>

      {/* Dialogs */}
      <AddBikeDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onBikeAdded={handleBikeAdded}
      />
      
      <EditBikeDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
        bike={selectedBike}
        onBikeUpdated={handleBikeUpdated}
      />
      
      <BikeComponentsDialog 
        open={isComponentsDialogOpen} 
        onOpenChange={setIsComponentsDialogOpen}
        bike={selectedBike}
        onComponentsUpdated={fetchBikes}
      />

      <UserProfilePopup 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen}
      />
    </div>
  );
};

export default Dashboard;