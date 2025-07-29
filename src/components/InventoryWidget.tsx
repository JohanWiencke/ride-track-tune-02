import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Euro } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface InventoryStats {
  totalParts: number;
  totalValue: number;
}

export const InventoryWidget = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<InventoryStats>({ totalParts: 0, totalValue: 0 });

  useEffect(() => {
    fetchInventoryStats();
  }, [user?.id]);

  const fetchInventoryStats = async () => {
    if (!user?.id) return;

    try {
      const { data: inventory, error } = await supabase
        .from('parts_inventory')
        .select('quantity, purchase_price')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalParts = inventory?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalValue = inventory?.reduce((sum, item) => sum + (item.purchase_price || 0) * item.quantity, 0) || 0;

      setStats({ totalParts, totalValue });
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Spare Parts Count Widget */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-glass-primary/30 via-glass-success/20 to-glass-primary/30 rounded-xl blur-xl group-hover:blur-lg transition-all duration-500 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <Card className="relative glass-card border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-500 animate-glow overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-50"></div>
          <CardContent className="relative p-4 z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-glass-primary/40 to-glass-success/40 rounded-lg blur-sm animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="relative p-2 bg-gradient-to-br from-glass-primary/30 to-glass-success/20 rounded-lg backdrop-blur-sm animate-float border border-white/20" style={{ animationDelay: '2s' }}>
                  <Package className="h-4 w-4 text-white drop-shadow-lg" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-white via-glass-primary to-glass-success bg-clip-text text-transparent drop-shadow-sm">{stats.totalParts}</p>
                <p className="text-xs text-white/70 font-medium">Spare Parts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Inventory Value Widget */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-glass-warning/30 via-yellow-500/20 to-glass-warning/30 rounded-xl blur-xl group-hover:blur-lg transition-all duration-500 animate-pulse" style={{ animationDelay: '2.5s' }}></div>
        <Card className="relative glass-card border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-500 animate-glow overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-50"></div>
          <CardContent className="relative p-4 z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-glass-warning/40 to-yellow-500/40 rounded-lg blur-sm animate-pulse" style={{ animationDelay: '2.5s' }}></div>
                <div className="relative p-2 bg-gradient-to-br from-glass-warning/30 to-yellow-500/20 rounded-lg backdrop-blur-sm animate-float border border-white/20" style={{ animationDelay: '2.5s' }}>
                  <Euro className="h-4 w-4 text-white drop-shadow-lg" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-white via-glass-warning to-yellow-400 bg-clip-text text-transparent drop-shadow-sm">€{stats.totalValue.toFixed(0)}</p>
                <p className="text-xs text-white/70 font-medium">Inventory Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};