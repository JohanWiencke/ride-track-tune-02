
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, TrendingUp, Euro, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SpendingData {
  period: string;
  amount: number;
  items: number;
}

const SpendingOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpendingData();
  }, []);

  const fetchSpendingData = async () => {
    if (!user) return;

    try {
      // Get receipts with extracted items
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('user_id', user.id)
        .eq('analysis_status', 'completed')
        .not('extracted_items', 'is', null);

      if (error) throw error;

      // Calculate spending for different periods
      const now = new Date();
      const periods = [
        { name: 'month', days: 30 },
        { name: '3months', days: 90 },
        { name: '6months', days: 180 },
        { name: 'year', days: 365 },
        { name: 'all_time', days: null }
      ];

      const calculations: SpendingData[] = periods.map(period => {
        let filteredReceipts = receipts || [];
        
        if (period.days) {
          const cutoffDate = new Date();
          cutoffDate.setDate(now.getDate() - period.days);
          filteredReceipts = receipts?.filter(receipt => 
            new Date(receipt.created_at) >= cutoffDate
          ) || [];
        }

        const totalAmount = filteredReceipts.reduce((sum, receipt) => {
          const items = receipt.extracted_items as Array<{price: number, quantity: number}> || [];
          return sum + items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
        }, 0);

        const totalItems = filteredReceipts.reduce((sum, receipt) => {
          const items = receipt.extracted_items as Array<{quantity: number}> || [];
          return sum + items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);

        return {
          period: period.name,
          amount: totalAmount,
          items: totalItems
        };
      });

      setSpendingData(calculations);
    } catch (error: any) {
      toast({
        title: "Error fetching spending data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPeriodName = (period: string) => {
    switch (period) {
      case 'month': return 'Last Month';
      case '3months': return 'Last 3 Months';
      case '6months': return 'Last 6 Months';
      case 'year': return 'Last Year';
      case 'all_time': return 'All Time';
      default: return period;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading spending overview...</p>
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
            <h1 className="text-lg font-semibold">Spending Overview</h1>
          </div>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spendingData.map((data) => (
            <Card key={data.period} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {formatPeriodName(data.period)}
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  {data.period === 'all_time' ? (
                    <TrendingUp className="h-4 w-4 text-primary" />
                  ) : (
                    <Calendar className="h-4 w-4 text-primary" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Euro className="h-4 w-4 text-green-500" />
                    <span className="text-2xl font-bold">€{data.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Receipt className="h-3 w-3" />
                    <span>{data.items} items</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {spendingData.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No spending data yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload some receipts from your parts inventory to see spending analytics.
              </p>
              <Button onClick={() => navigate('/parts-inventory')}>
                Go to Parts Inventory
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SpendingOverview;
