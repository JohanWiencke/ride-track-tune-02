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
  const [isValuating, setIsValuating] = useState(false);
  const [totalEstimatedValue, setTotalEstimatedValue] = useState(0);
  const [totalOriginalValue, setTotalOriginalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [valuationHistory, setValuationHistory] = useState<ValuationHistory[]>([]);
  const [showChart, setShowChart] = useState(false);
  const [canValuate, setCanValuate] = useState(true);

  const fetchBikes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bikes')
        .select('id, name, brand, model, year, estimated_value, last_valuation_date, price')
        .eq('user_id', user.id);

      if (error) throw error;

      setBikes(data || []);
      
      const estimatedTotal = data?.reduce((sum, bike) => sum + (bike.estimated_value || 0), 0) || 0;
      // Use estimated total as "original" value for percentage calculation
      const originalTotal = estimatedTotal;
      
      setTotalEstimatedValue(estimatedTotal);
      setTotalOriginalValue(originalTotal);
      
      // Check if user can valuate (rate limiting)
      await checkCanValuate();
    } catch (error) {
      console.error('Error fetching bikes:', error);
      toast.error("Failed to fetch bike data");
    } finally {
      setLoading(false);
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

  const checkCanValuate = async () => {
    if (!user) return;

    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3.5);

      const { data, error } = await supabase
        .from('bikes')
        .select('last_valuation_date')
        .eq('user_id', user.id)
        .gte('last_valuation_date', threeDaysAgo.toISOString())
        .limit(1);

      if (error) {
        console.error('Error checking rate limit:', error);
        setCanValuate(true);
      } else {
        setCanValuate(!data || data.length === 0);
      }
    } catch (error) {
      console.error('Error checking rate limit:', error);
      setCanValuate(true);
    }
  };

  const saveValuationHistory = async (estimatedValue: number, bikesValued: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('valuation_history')
        .insert({
          user_id: user.id,
          total_estimated_value: estimatedValue,
          total_bikes_valued: bikesValued
        });

      if (error) {
        console.error('Error saving valuation history:', error);
      } else {
        await fetchValuationHistory();
      }
    } catch (error) {
      console.error('Error saving valuation history:', error);
    }
  };

  const valuateBike = async (bikeId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('bike-valuation', {
        body: { bikeId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Bike valued at €${data.estimatedValue}`);
        await fetchBikes(); // Refresh data
        return true;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error valuating bike:', error);
      toast.error(`Valuation failed: ${error.message}`);
      return false;
    }
  };

  const valuateAllBikes = async () => {
    if (!canValuate) {
      toast.error('You can only valuate your garage twice per week. Please try again later.');
      return;
    }

    setIsValuating(true);
    let successCount = 0;
    
    for (const bike of bikes) {
      const success = await valuateBike(bike.id);
      if (success) successCount++;
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Save to history after successful valuation
    if (successCount > 0) {
      const newEstimatedTotal = bikes.reduce((sum, bike) => sum + (bike.estimated_value || 0), 0);
      await saveValuationHistory(newEstimatedTotal, successCount);
    }
    
    setIsValuating(false);
    toast.success(`${successCount} bikes valued successfully`);
    
    // Refresh data and rate limit check
    await fetchBikes();
  };

  useEffect(() => {
    fetchBikes();
    fetchValuationHistory();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastValuationDate = bikes
    .filter(bike => bike.last_valuation_date)
    .sort((a, b) => new Date(b.last_valuation_date!).getTime() - new Date(a.last_valuation_date!).getTime())[0]?.last_valuation_date;

  const valuedBikesCount = bikes.filter(bike => bike.estimated_value).length;

  return (
    <Card className="backdrop-blur-sm bg-white/30 dark:bg-black/30 border border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Garage Valuation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Current Market Value</p>
            <p className="text-2xl font-bold text-green-600">
              €{totalEstimatedValue.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Original Purchase Value</p>
            <p className="text-xl font-semibold text-muted-foreground">
              €{totalOriginalValue.toLocaleString()}
            </p>
          </div>
        </div>

        {totalOriginalValue > 0 && totalEstimatedValue > 0 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm">
              Value change: 
              <span className={`font-semibold ml-1 ${
                totalEstimatedValue >= totalOriginalValue ? 'text-green-600' : 'text-red-600'
              }`}>
                {totalEstimatedValue >= totalOriginalValue ? '+' : ''}
                €{(totalEstimatedValue - totalOriginalValue).toLocaleString()}
                {' '}({((totalEstimatedValue - totalOriginalValue) / totalOriginalValue * 100).toFixed(1)}%)
              </span>
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{valuedBikesCount} of {bikes.length} bikes valued</span>
          {lastValuationDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(lastValuationDate).toLocaleDateString()}
            </span>
          )}
        </div>

        {!canValuate && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Rate limit: You can only valuate twice per week. Next valuation available soon.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={valuateAllBikes}
            disabled={isValuating || bikes.length === 0 || !canValuate}
            className="flex-1"
            variant="outline"
          >
            {isValuating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Valuating...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                {valuedBikesCount === 0 ? 'Get Market Valuation' : 'Update Valuations'}
              </>
            )}
          </Button>
          
          {valuationHistory.length > 1 && (
            <Button
              onClick={() => setShowChart(!showChart)}
              variant="outline"
              size="icon"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {showChart && valuationHistory.length > 1 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-3">Valuation History</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={valuationHistory.map(entry => ({
                  date: new Date(entry.created_at).toLocaleDateString(),
                  value: entry.total_estimated_value
                }))}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `€${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toLocaleString()}`, 'Estimated Value']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {bikes.length === 0 && (
          <p className="text-center text-muted-foreground text-sm">
            Add bikes to your garage to see market valuations
          </p>
        )}
      </CardContent>
    </Card>
  );
};