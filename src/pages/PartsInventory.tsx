import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package, Wrench, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReceiptUpload } from '@/components/ReceiptUpload';
import { SpendingAnalytics } from '@/components/SpendingAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InventoryItem {
  id: string;
  component_type_id: string;
  component_type: {
    name: string;
    default_replacement_distance: number;
  };
  quantity: number;
  purchase_price?: number;
  notes?: string;
  created_at: string;
}

interface ComponentType {
  id: string;
  name: string;
  default_replacement_distance: number;
}

const PartsInventory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [componentTypes, setComponentTypes] = useState<ComponentType[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedComponentType, setSelectedComponentType] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!user?.id) return;

      // Fetch inventory from parts_inventory table
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('parts_inventory')
        .select(`
          *,
          component_type:component_types(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (inventoryError) throw inventoryError;

      // Fetch component types
      const { data: typesData, error: typesError } = await supabase
        .from('component_types')
        .select('*')
        .order('name');

      if (typesError) throw typesError;

      setInventory(inventoryData || []);
      setComponentTypes(typesData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching inventory",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addInventoryItem = async () => {
    if (!selectedComponentType || !user?.id) return;
    
    setSaving(true);
    try {
      // Ensure price is properly converted to number or null
      const priceValue = price.trim() !== '' ? parseFloat(price) : null;
      
      console.log('Adding inventory item with price:', priceValue); // Debug log
      
      const { error } = await supabase
        .from('parts_inventory')
        .insert({
          user_id: user.id,
          component_type_id: selectedComponentType,
          quantity: parseInt(quantity),
          purchase_price: priceValue,
          notes: notes || null,
        });

      if (error) throw error;

      toast({
        title: "Item added to inventory",
        description: "The part has been added to your inventory.",
      });

      resetForm();
      setShowAddItem(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error adding inventory item:', error); // Debug log
      toast({
        title: "Error adding item",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    try {
      const { error } = await supabase
        .from('parts_inventory')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));

      if (newQuantity === 0) {
        toast({
          title: "Item depleted",
          description: "This item is now out of stock.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error updating quantity",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('parts_inventory')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setInventory(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Item removed",
        description: "The item has been removed from your inventory.",
      });
    } catch (error: any) {
      toast({
        title: "Error removing item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedComponentType('');
    setQuantity('1');
    setPrice('');
    setNotes('');
  };

  const getTotalValue = () => {
    return inventory.reduce((total, item) => {
      return total + (item.purchase_price || 0) * item.quantity;
    }, 0);
  };

  const getOutOfStockItems = () => {
    return inventory.filter(item => item.quantity === 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your parts inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-glass-blue/10 via-background to-glass-purple/10">
      <header className="border-b glass-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src="/lovable-uploads/4ff90988-aa97-4e30-a9cc-2d87ae0687bd.png" alt="BMT" className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Parts Inventory</h1>
          </div>
          <Button size="sm" onClick={() => setShowAddItem(true)} className="gap-1">
            <Plus className="h-3 w-3" />
            <span className="hidden sm:inline">Add Part</span>
          </Button>
        </div>
      </header>

      <div className="container py-6">
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{inventory.length}</p>
                      <p className="text-sm text-muted-foreground">Total Items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Wrench className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">€{getTotalValue().toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <ShoppingCart className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{getOutOfStockItems().length}</p>
                      <p className="text-sm text-muted-foreground">Out of Stock</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inventory List */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Your Parts</CardTitle>
              </CardHeader>
              <CardContent>
                {inventory.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No parts in inventory</h3>
                    <p className="text-muted-foreground mb-4">
                      Add parts manually or upload a receipt to get started.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => setShowAddItem(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Manually
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inventory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{item.component_type.name}</h4>
                            {item.quantity === 0 && (
                              <Badge variant="destructive">Out of Stock</Badge>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mb-2">{item.notes}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Quantity: {item.quantity}</span>
                            {item.purchase_price && (
                              <span>Price: €{item.purchase_price.toFixed(2)} each</span>
                            )}
                            <span>Added: {new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity === 0}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteItem(item.id)}
                            className="ml-2"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receipts" className="space-y-6">
            <ReceiptUpload onReceiptProcessed={fetchData} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <SpendingAnalytics />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Part to Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Component Type</Label>
              <select
                value={selectedComponentType}
                onChange={(e) => setSelectedComponentType(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Select a component type</option>
                {componentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Purchase Price (per item, €)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Optional"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this part"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddItem(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={addInventoryItem}
                disabled={!selectedComponentType || saving}
                className="flex-1"
              >
                {saving ? "Adding..." : "Add Part"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartsInventory;
