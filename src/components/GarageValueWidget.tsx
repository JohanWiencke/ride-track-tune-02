import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, RefreshCw, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

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

export const GarageValueWidget = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [isValuating, setIsValuating] = useState(false);
  const [totalEstimatedValue, setTotalEstimatedValue] = useState(0);
  const [totalOriginalValue, setTotalOriginalValue] = useState(0);
  const [loading, setLoading] = useState(true);

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
      const originalTotal = data?.reduce((sum, bike) => sum + (bike.price || 0), 0) || 0;
      
      setTotalEstimatedValue(estimatedTotal);
      setTotalOriginalValue(originalTotal);
    } catch (error) {
      console.error('Error fetching bikes:', error);
      toast.error("Failed to fetch bike data");
    } finally {
      setLoading(false);
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
    setIsValuating(true);
    let successCount = 0;
    
    for (const bike of bikes) {
      const success = await valuateBike(bike.id);
      if (success) successCount++;
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsValuating(false);
    toast.success(`${successCount} bikes valued successfully`);
  };

  useEffect(() => {
    fetchBikes();
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

        <Button 
          onClick={valuateAllBikes}
          disabled={isValuating || bikes.length === 0}
          className="w-full"
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

        {bikes.length === 0 && (
          <p className="text-center text-muted-foreground text-sm">
            Add bikes to your garage to see market valuations
          </p>
        )}
      </CardContent>
    </Card>
  );
};