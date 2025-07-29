import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Plus, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

interface Bike {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  total_distance: number;
}

interface ComponentType {
  id: string;
  name: string;
  default_replacement_distance: number;
  description?: string;
}

interface BikeComponent {
  id: string;
  bike_id: string;
  component_type_id: string;
  replacement_distance: number;
  current_distance: number;
  is_active: boolean;
  component_type: ComponentType;
}

interface BikeComponentsDialogProps {
  bike: Bike;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComponentsUpdated: () => void;
}

export const BikeComponentsDialog = ({ bike, open, onOpenChange, onComponentsUpdated }: BikeComponentsDialogProps) => {
  const [components, setComponents] = useState<BikeComponent[]>([]);
  const [componentTypes, setComponentTypes] = useState<ComponentType[]>([]);
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [selectedComponentType, setSelectedComponentType] = useState('');
  const [customDistance, setCustomDistance] = useState('');
  const [initialDistance, setInitialDistance] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, bike.id]);

  const fetchData = async () => {
    try {
      // Fetch bike components
      const { data: componentsData, error: componentsError } = await supabase
        .from('bike_components')
        .select(`
          *,
          component_type:component_types(*)
        `)
        .eq('bike_id', bike.id)
        .eq('is_active', true);

      if (componentsError) throw componentsError;

      // Fetch all component types
      const { data: typesData, error: typesError } = await supabase
        .from('component_types')
        .select('*')
        .order('name');

      if (typesError) throw typesError;

      setComponents(componentsData || []);
      setComponentTypes(typesData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching components",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addComponent = async () => {
    if (!selectedComponentType) return;
    
    setUpdating(true);
    try {
      const componentType = componentTypes.find(ct => ct.id === selectedComponentType);
      const replacementDistance = parseFloat(customDistance) || componentType?.default_replacement_distance || 0;
      const currentDistance = parseFloat(initialDistance) || 0;

      const { error } = await supabase
        .from('bike_components')
        .insert({
          bike_id: bike.id,
          component_type_id: selectedComponentType,
          replacement_distance: replacementDistance,
          current_distance: currentDistance,
          install_distance: bike.total_distance - currentDistance,
        });

      if (error) throw error;

      toast({
        title: "Component added",
        description: "Component has been added to your bike.",
      });

      setSelectedComponentType('');
      setCustomDistance('');
      setInitialDistance('');
      setShowAddComponent(false);
      await fetchData();
      onComponentsUpdated();
    } catch (error: any) {
      toast({
        title: "Error adding component",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const replaceComponent = async (componentId: string) => {
    setUpdating(true);
    try {
      // Mark current component as inactive
      await supabase
        .from('bike_components')
        .update({ is_active: false })
        .eq('id', componentId);

      // Create maintenance record
      const component = components.find(c => c.id === componentId);
      if (component) {
        await supabase
          .from('maintenance_records')
          .insert({
            bike_component_id: componentId,
            action_type: 'replaced',
            distance_at_action: bike.total_distance,
          });

        // Add new component
        await supabase
          .from('bike_components')
          .insert({
            bike_id: bike.id,
            component_type_id: component.component_type_id,
            replacement_distance: component.replacement_distance,
            current_distance: 0,
            install_distance: bike.total_distance,
          });
      }

      toast({
        title: "Component replaced",
        description: "Component has been replaced successfully.",
      });

      await fetchData();
      onComponentsUpdated();
    } catch (error: any) {
      toast({
        title: "Error replacing component",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getComponentStatus = (component: BikeComponent) => {
    const usage = (component.current_distance / component.replacement_distance) * 100;
    if (usage >= 90) return { status: 'critical', color: 'destructive', icon: AlertTriangle };
    if (usage >= 70) return { status: 'warning', color: 'secondary', icon: AlertTriangle };
    return { status: 'good', color: 'default', icon: CheckCircle };
  };

  const availableComponentTypes = componentTypes.filter(ct => 
    !components.some(c => c.component_type_id === ct.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage {bike.name} Components
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Components */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Current Components</h3>
              {components.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No components added yet. Add your first component below.
                </p>
              ) : (
                <div className="space-y-3">
                  {components.map((component) => {
                    const usage = (component.current_distance / component.replacement_distance) * 100;
                    const { status, color, icon: StatusIcon } = getComponentStatus(component);
                    
                    return (
                      <Card key={component.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{component.component_type.name}</h4>
                                <Badge variant={color as any} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {Math.round(usage)}%
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>Usage: {component.current_distance.toLocaleString()} / {component.replacement_distance.toLocaleString()} km</span>
                                  <span>{Math.max(0, component.replacement_distance - component.current_distance).toLocaleString()} km remaining</span>
                                </div>
                                <Progress value={Math.min(100, usage)} className="h-2" />
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => replaceComponent(component.id)}
                              disabled={updating}
                              className="ml-4"
                            >
                              Replace
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Component */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Component</h3>
                {!showAddComponent && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddComponent(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Component
                  </Button>
                )}
              </div>

              {showAddComponent && (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Component Type</Label>
                      <select
                        value={selectedComponentType}
                        onChange={(e) => setSelectedComponentType(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="">Select a component type</option>
                        {availableComponentTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name} (default: {type.default_replacement_distance}km)
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedComponentType && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Custom Replacement Distance (km)</Label>
                          <Input
                            type="number"
                            value={customDistance}
                            onChange={(e) => setCustomDistance(e.target.value)}
                            placeholder={`Default: ${componentTypes.find(ct => ct.id === selectedComponentType)?.default_replacement_distance || 0}km`}
                            min="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Current Distance Used (km)</Label>
                          <Input
                            type="number"
                            value={initialDistance}
                            onChange={(e) => setInitialDistance(e.target.value)}
                            placeholder="0 (for new component)"
                            min="0"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter how many kilometers this component has already been used if it's not new.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddComponent(false);
                          setSelectedComponentType('');
                          setCustomDistance('');
                          setInitialDistance('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={addComponent}
                        disabled={!selectedComponentType || updating}
                        className="flex-1"
                      >
                        {updating ? "Adding..." : "Add Component"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};