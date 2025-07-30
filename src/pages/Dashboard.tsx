import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StravaConnect } from '@/components/StravaConnect';
import { UserProfile } from '@/components/UserProfile';
import { 
  Bike, 
  Plus, 
  Wrench, 
  TrendingUp, 
  Package,
  Settings,
  Calendar,
  User
} from 'lucide-react';
import { AddBikeDialog } from '@/components/AddBikeDialog';
import { EditBikeDialog } from '@/components/EditBikeDialog';
import { BikeComponentsDialog } from '@/components/BikeComponentsDialog';
import { GarageValueWidget } from '@/components/GarageValueWidget';
import { GarageConditionWidget } from '@/components/GarageConditionWidget';
import { InventoryWidget } from '@/components/InventoryWidget';
import { TimeBasedGreeting } from '@/components/TimeBasedGreeting';

interface BikeData {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  bike_type: string;
  year?: number;
  total_distance: number;
  image_url?: string;
  estimated_value?: number;
  last_valuation_date?: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bikes, setBikes] = useState<BikeData[]>([]);
  const [isAddBikeOpen, setIsAddBikeOpen] = useState(false);
  const [isEditBikeOpen, setIsEditBikeOpen] = useState(false);
  const [selectedBike, setSelectedBike] = useState<BikeData | null>(null);
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [isBikeComponentsOpen, setIsBikeComponentsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user) {
      fetchBikes();
    }
  }, [user]);

  const fetchBikes = async () => {
    try {
      const { data, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bikes:', error);
        toast({
          title: "Error",
          description: "Failed to fetch bikes",
          variant: "destructive",
        });
      } else {
        setBikes(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleBikeAdded = (newBike: BikeData) => {
    setBikes([newBike, ...bikes]);
  };

  const handleBikeUpdated = (updatedBike: BikeData) => {
    setBikes(bikes.map(bike => bike.id === updatedBike.id ? updatedBike : bike));
  };

  const handleBikeDeleted = (deletedBikeId: string) => {
    setBikes(bikes.filter(bike => bike.id !== deletedBikeId));
  };

  const handleEditBike = (bike: BikeData) => {
    setSelectedBike(bike);
    setIsEditBikeOpen(true);
  };

  const handleStravaSync = () => {
    fetchBikes();
  };

  const handleOpenBikeComponents = (bike: BikeData) => {
    setSelectedBike(bike);
    setIsBikeComponentsOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <TimeBasedGreeting />
            <p className="text-muted-foreground">
              Track your bikes, monitor component wear, and manage your cycling gear
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsAddBikeOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Bike
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="garage" className="gap-2">
              <Bike className="w-4 h-4" />
              My Garage
            </TabsTrigger>
            <TabsTrigger value="components" className="gap-2">
              <Wrench className="w-4 h-4" />
              Components
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Package className="w-4 h-4" />
              Parts
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <GarageValueWidget bikes={bikes} />
              <GarageConditionWidget bikes={bikes} />
              <InventoryWidget />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest bike-related activities and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No recent activity to display. Add a bike or connect to Strava to start tracking your rides.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="garage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Bike Garage</CardTitle>
                <CardDescription>Manage and view your bikes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bikes.length === 0 ? (
                  <p className="text-muted-foreground">No bikes added yet. Add your first bike to start tracking!</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {bikes.map((bike) => (
                      <Card key={bike.id} className="bg-white shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold">{bike.name}</CardTitle>
                          <CardDescription>
                            {bike.brand} {bike.model} ({bike.year})
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {bike.image_url && (
                            <img src={bike.image_url} alt={bike.name} className="rounded-md aspect-video object-cover mb-2" />
                          )}
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{bike.bike_type}</Badge>
                            {bike.estimated_value && (
                              <div className="text-sm text-muted-foreground">
                                Value: ${bike.estimated_value}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Total Distance: {bike.total_distance} km
                          </p>
                          <div className="flex justify-between">
                            <Button size="sm" variant="outline" onClick={() => handleEditBike(bike)}>
                              Edit
                            </Button>
                            <Button size="sm" onClick={() => handleOpenBikeComponents(bike)}>
                              Components
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Component Management</CardTitle>
                <CardDescription>Track and manage components across all your bikes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Select a bike to manage its components.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Parts Inventory</CardTitle>
                <CardDescription>Manage your spare parts and components</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Keep track of your spare parts and components.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <UserProfile />
              <StravaConnect
                isConnected={isStravaConnected}
                onConnectionChange={setIsStravaConnected}
                onSyncComplete={handleStravaSync}
              />
            </div>
          </TabsContent>
        </Tabs>

        <AddBikeDialog
          open={isAddBikeOpen}
          onOpenChange={setIsAddBikeOpen}
          onBikeAdded={handleBikeAdded}
        />

        {selectedBike && (
          <EditBikeDialog
            open={isEditBikeOpen}
            onOpenChange={setIsEditBikeOpen}
            bike={selectedBike}
            onBikeUpdated={handleBikeUpdated}
            onBikeDeleted={handleBikeDeleted}
          />
        )}

        {selectedBike && (
          <BikeComponentsDialog
            open={isBikeComponentsOpen}
            onOpenChange={setIsBikeComponentsOpen}
            bike={selectedBike}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
