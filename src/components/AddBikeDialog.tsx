import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface AddBikeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBikeAdded: () => void;
}

export const AddBikeDialog = ({ open, onOpenChange, onBikeAdded }: AddBikeDialogProps) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [totalDistance, setTotalDistance] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('bikes')
        .insert({
          name,
          brand: brand || null,
          model: model || null,
          total_distance: parseFloat(totalDistance) || 0,
          user_id: (await supabase.auth.getUser()).data.user?.id!,
        });

      if (error) throw error;

      toast({
        title: "Bike added successfully!",
        description: `${name} has been added to your collection.`,
      });

      // Reset form
      setName('');
      setBrand('');
      setModel('');
      setTotalDistance('');
      onOpenChange(false);
      onBikeAdded();
    } catch (error: any) {
      toast({
        title: "Error adding bike",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Bike</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bike Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Road Bike, Mountain Bike"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Trek, Specialized"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g., Domane, Stumpjumper"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="totalDistance">Current Total Distance (km)</Label>
            <Input
              id="totalDistance"
              type="number"
              value={totalDistance}
              onChange={(e) => setTotalDistance(e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Bike"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};