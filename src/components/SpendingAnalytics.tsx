
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Euro, TrendingUp, Calendar, Receipt, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';

interface SpendingPeriod {
  period: string;
  amount: number;
  receipts: number;
}

interface RecentPurchase {
  id: string;
  store_name: string;
  total_amount: number;
  purchase_date: string;
  items_count: number;
}

export const SpendingAnalytics = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [spendingData, setSpendingData] = useState<SpendingPeriod[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchSpendingData();
  }, [user?.id]);

  const fetchSpendingData = async () => {
    if (!user?.id) return;

    try {
      // Fetch spending data for different periods
      const now = new Date();
      const periods = [
        { key: '1month', days: 30, label: 'Last Month' },
        { key: '3months', days: 90, label: 'Last 3 Months' },
        { key: '6months', days: 180, label: 'Last 6 Months' },
        { key: '1year', days: 365, label: 'Last Year' },
        { key: 'alltime', days: null, label: 'All Time' }
      ];

      const spendingResults: SpendingPeriod[] = [];

      for (const period of periods) {
        let query = supabase
          .from('receipts')
          .select('total_amount, created_at')
          .eq('user_id', user.id)
          .not('total_amount', 'is', null);

        if (period.days) {
          const startDate = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
          query = query.gte('created_at', startDate.toISOString());
        }

        const { data: receipts, error } = await query;

        if (error) {
          console.error('Error fetching receipts:', error);
          continue;
        }

        const totalAmount = receipts?.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0) || 0;
        const receiptsCount = receipts?.length || 0;

        spendingResults.push({
          period: period.label,
          amount: totalAmount,
          receipts: receiptsCount
        });
      }

      setSpendingData(spendingResults);

      // Fetch recent purchases
      const { data: recentData, error: recentError } = await supabase
        .from('receipts')
        .select(`
          id,
          store_name,
          total_amount,
          purchase_date,
          analysis_result
        `)
        .eq('user_id', user.id)
        .not('total_amount', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent purchases:', recentError);
      } else {
        const recentPurchasesData = recentData?.map(receipt => ({
          id: receipt.id,
          store_name: receipt.store_name || 'Unknown Store',
          total_amount: receipt.total_amount || 0,
          purchase_date: receipt.purchase_date || new Date().toISOString().split('T')[0],
          items_count: receipt.analysis_result ? 
            (Array.isArray(receipt.analysis_result) ? receipt.analysis_result.length : 0) : 0
        })) || [];

        setRecentPurchases(recentPurchasesData);
      }

    } catch (error: any) {
      console.error('Error fetching spending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetStatistics = async () => {
    if (!user?.id) return;
    
    setResetting(true);
    try {
      // Delete all receipts and their associated inventory items
      const { error: inventoryError } = await supabase
        .from('parts_inventory')
        .delete()
        .eq('user_id', user.id)
        .not('receipt_id', 'is', null);

      if (inventoryError) throw inventoryError;

      // Delete all receipt images from storage
      const { data: receipts } = await supabase
        .from('receipts')
        .select('image_url')
        .eq('user_id', user.id);

      if (receipts && receipts.length > 0) {
        const filePaths = receipts.map(receipt => {
          const url = receipt.image_url;
          const path = url.split('/receipt-images/')[1];
          return path;
        }).filter(Boolean);

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('receipt-images')
            .remove(filePaths);

          if (storageError) {
            console.warn('Some receipt images could not be deleted:', storageError);
          }
        }
      }

      // Delete all receipts
      const { error: receiptsError } = await supabase
        .from('receipts')
        .delete()
        .eq('user_id', user.id);

      if (receiptsError) throw receiptsError;

      toast({
        title: "Statistics Reset",
        description: "All receipt data and associated inventory items have been cleared.",
      });

      // Refresh the data
      await fetchSpendingData();

    } catch (error: any) {
      console.error('Error resetting statistics:', error);
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading spending data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Reset Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Spending Analytics</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset Statistics
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset All Statistics?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your receipts, spending data, and associated inventory items that were added from receipts. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={resetStatistics}
                disabled={resetting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {resetting ? "Resetting..." : "Reset Statistics"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Spending Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {spendingData.map((period, index) => (
          <Card key={period.period} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-primary/10 rounded">
                  <Euro className="h-3 w-3 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {period.receipts} receipts
                </Badge>
              </div>
              <p className="text-xl font-bold">€{period.amount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{period.period}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Purchases */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPurchases.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No purchases tracked yet</h3>
              <p className="text-muted-foreground">
                Upload your first receipt to start tracking your bike parts spending.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{purchase.store_name}</h4>
                      {purchase.items_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {purchase.items_count} items
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(purchase.purchase_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">€{purchase.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
