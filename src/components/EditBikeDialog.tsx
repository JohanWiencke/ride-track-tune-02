import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ImageUpload } from './ImageUpload';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const editBikeSchema = z.object({
  name: z.string().min(1, 'Bike name is required'),
  brand: z.string().optional(),
  model: z.string().optional(),
  bike_type: z.enum(['road', 'mountain', 'gravel', 'hybrid', 'bmx', 'electric']),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  weight: z.coerce.number().positive().optional(),
  price: z.coerce.number().positive().optional(),
  purchase_date: z.date().optional(),
  component_details: z.string().optional(),
});

type EditBikeFormData = z.infer<typeof editBikeSchema>;

interface Bike {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  bike_type: string;
  year?: number;
  weight?: number;
  price?: number;
  total_distance: number;
  image_url?: string;
  purchase_date?: string;
  component_details?: string;
}

interface EditBikeDialogProps {
  bike: Bike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBikeUpdated: () => void;
  onBikeDeleted: (deletedBikeId: string) => void;
}

export function EditBikeDialog({ bike, open, onOpenChange, onBikeUpdated, onBikeDeleted }: EditBikeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<EditBikeFormData>({
    resolver: zodResolver(editBikeSchema),
    defaultValues: {
      name: bike?.name || '',
      brand: bike?.brand || '',
      model: bike?.model || '',
      bike_type: (bike?.bike_type as EditBikeFormData['bike_type']) || 'road',
      year: bike?.year || undefined,
      weight: bike?.weight || undefined,
      price: bike?.price || undefined,
      purchase_date: bike?.purchase_date ? new Date(bike.purchase_date) : undefined,
      component_details: bike?.component_details || '',
    },
  });

  // Reset form when bike changes
  useState(() => {
    if (bike) {
      form.reset({
        name: bike.name,
        brand: bike.brand || '',
        model: bike.model || '',
        bike_type: (bike.bike_type as EditBikeFormData['bike_type']) || 'road',
        year: bike.year || undefined,
        weight: bike.weight || undefined,
        price: bike.price || undefined,
        purchase_date: bike.purchase_date ? new Date(bike.purchase_date) : undefined,
        component_details: bike.component_details || '',
      });
      setImageUrl(bike.image_url || '');
    }
  });

  const onSubmit = async (data: EditBikeFormData) => {
    if (!bike) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('bikes')
        .update({
          name: data.name,
          brand: data.brand || null,
          model: data.model || null,
          bike_type: data.bike_type,
          year: data.year || null,
          weight: data.weight || null,
          price: data.price || null,
          purchase_date: data.purchase_date ? data.purchase_date.toISOString().split('T')[0] : null,
          component_details: data.component_details || null,
          image_url: imageUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bike.id);

      if (error) throw error;

      toast({
        title: "Bike updated!",
        description: "Your bike details have been updated successfully.",
      });

      onBikeUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error updating bike",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bike</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bike Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter bike name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Trek, Specialized, Canyon" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Domane AL 2, Tarmac SL7" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bike_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bike type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="road">Road</SelectItem>
                      <SelectItem value="mountain">Mountain</SelectItem>
                      <SelectItem value="gravel">Gravel</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="bmx">BMX</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 2023" 
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1" 
                        placeholder="7.5" 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="2500" 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purchase_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Purchase Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Bike Image</Label>
              <ImageUpload
                currentImageUrl={imageUrl}
                onImageUploaded={setImageUrl}
                bucket="bike-images"
                folder={user?.id || 'unknown'}
                variant="bike"
              />
            </div>

            <FormField
              control={form.control}
              name="component_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component Details</FormLabel>
                  <FormControl>
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
                      placeholder="List key components for better valuation accuracy (e.g., Shimano Ultegra groupset, carbon wheels, premium components, etc.)"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Bike"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
