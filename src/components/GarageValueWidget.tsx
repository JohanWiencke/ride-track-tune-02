
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, RefreshCw, Calendar, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Bike {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  estimated_value: number | null;
  last_valuation_date: string | null;
  price: number | null;
  created_at?: string;
  purchase_date?: string;
}

interface BikeValuation {
  id: string;
  bike_id: string;
  valuation_date: string;
  estimated_value: number;
  valuation_source: string;
}

interface ValuationHistory {
  id: string;
  total_estimated_value: number;
  total_bikes_valued: number;
  created_at: string;
}

export const GarageValueWidget = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [bikeValuations, setBikeValuations] = useState<BikeValuation[]>([]);
  const [isValuating, setIsValuating] = useState(false);
  const [totalEstimatedValue, setTotalEstimatedValue] = useState(0);
  const [totalOriginalValue, setTotalOriginalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [valuationHistory, setValuationHistory] = useState<ValuationHistory[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [canValuate, setCanValuate] = useState(true);

  const fetchBikeValuations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bike_valuations')
        .select(`
          *,
          bikes!inner(user_id, name, brand, model)
        `)
        .eq('bikes.user_id', user.id)
        .order('valuation_date', { ascending: true });

      if (error) throw error;
      setBikeValuations(data || []);
    } catch (error) {
      console.error('Error fetching bike valuations:', error);
    }
  };

  const fetchBikes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bikes')
        .select('id, name, brand, model, year, estimated_value, last_valuation_date, price, purchase_date, created_at')
        .eq('user_id', user.id);

      if (error) throw error;

      setBikes(data || []);
      
      const estimatedTotal = data?.reduce((sum, bike) => sum + (bike.estimated_value || 0), 0) || 0;
      const originalTotal = data?.reduce((sum, bike) => sum + (bike.price || 0), 0) || 0;
      
      setTotalEstimatedValue(estimatedTotal);
      setTotalOriginalValue(originalTotal);
    } catch (error) {
      console.error('Error fetching bikes:', error);
      toast.error(t('Failed to fetch bikes'));
    }
  };

  const fetchValuationHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('valuation_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setValuationHistory(data || []);
    } catch (error) {
      console.error('Error fetching valuation history:', error);
    }
  };

  const updateBikeValuations = async () => {
    if (!user || bikes.length === 0) {
      toast.error(t('No bikes to valuate'));
      return;
    }

    setIsValuating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('bike-valuation', {
        body: { 
          bikes: bikes.map(bike => ({
            id: bike.id,
            brand: bike.brand,
            model: bike.model,
            year: bike.year
          }))
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(t('Bike valuations updated successfully'));
        await fetchBikes();
        await fetchBikeValuations();
        await fetchValuationHistory();
        setCanValuate(false);
        
        // Re-enable valuation after 24 hours
        setTimeout(() => setCanValuate(true), 24 * 60 * 60 * 1000);
      } else {
        throw new Error(data?.error || 'Valuation failed');
      }
    } catch (error) {
      console.error('Error updating valuations:', error);
      toast.error(t('Failed to update bike valuations'));
    } finally {
      setIsValuating(false);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchBikes(),
        fetchBikeValuations(),
        fetchValuationHistory()
      ]).finally(() => setLoading(false));
    }
  }, [user]);

  const valueChange = totalEstimatedValue - totalOriginalValue;
  const valueChangePercentage = totalOriginalValue > 0 ? ((valueChange / totalOriginalValue) * 100) : 0;
  
  const chartData = valuationHistory.map(entry => ({
    date: new Date(entry.created_at).toLocaleDateString(),
    value: entry.total_estimated_value
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('Garage Value')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">{t('Loading...')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {t('Garage Value')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('Current Value')}</p>
              <p className="text-2xl font-bold">${totalEstimatedValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Original Value')}</p>
              <p className="text-2xl font-bold">${totalOriginalValue.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {valueChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${valueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${Math.abs(valueChange).toLocaleString()} ({Math.abs(valueChangePercentage).toFixed(1)}%)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={updateBikeValuations} 
              disabled={isValuating || !canValuate}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isValuating ? 'animate-spin' : ''}`} />
              {isValuating ? t('Updating...') : t('Update Values')}
            </Button>
            
            {chartData.length > 0 && (
              <Button 
                onClick={() => setShowChart(!showChart)}
                variant="outline"
                className="flex-1"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showChart ? t('Hide Chart') : t('Show Chart')}
              </Button>
            )}
          </div>

          {showChart && chartData.length > 0 && (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {bikes.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" />
                <span>{t('Last updated')}: {bikes[0]?.last_valuation_date ? new Date(bikes[0].last_valuation_date).toLocaleDateString() : t('Never')}</span>
              </div>
              <p>{t('Tracking')} {bikes.length} {bikes.length === 1 ? t('bike') : t('bikes')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
