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
    // Rate limiting disabled per user request
    setCanValuate(true);
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

  const valuateBike = async (bikeId: string, isLastBike: boolean = false, totalEstimated: number = 0, bikesValued: number = 0) => {
    try {
      const { data, error } = await supabase.functions.invoke('bike-valuation', {
        body: { 
          bikeId,
          batchComplete: isLastBike,
          totalEstimatedValue: totalEstimated,
          totalBikesValued: bikesValued
        }
      });

      if (error) throw error;

      if (data.success) {
        // Save individual bike valuation to bike_valuations table
        const { error: valuationError } = await supabase
          .from('bike_valuations')
          .insert({
            bike_id: bikeId,
            estimated_value: data.estimatedValue,
            valuation_source: 'automated',
            valuation_date: new Date().toISOString()
          });

        if (valuationError) {
          console.error('Error saving bike valuation:', valuationError);
        } else {
          // Immediately refresh bike valuations to update the chart
          await fetchBikeValuations();
        }
        
        toast.success(`Bike valued at €${data.estimatedValue}`);
        return { success: true, estimatedValue: data.estimatedValue };
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error valuating bike:', error);
      toast.error(`Valuation failed: ${error.message}`);
      return { success: false, estimatedValue: 0 };
    }
  };

  const updateGarageValue = async () => {
    setLoading(true);
    try {
      // For bikes with original price, create initial valuation records if they don't exist
      for (const bike of bikes) {
        if (bike.price && bike.purchase_date) {
          const { data: existingValuation } = await supabase
            .from('bike_valuations')
            .select('id')
            .eq('bike_id', bike.id)
            .eq('valuation_source', 'purchase')
            .single();

          if (!existingValuation) {
            await supabase
              .from('bike_valuations')
              .insert({
                bike_id: bike.id,
                estimated_value: bike.price,
                valuation_date: bike.purchase_date,
                valuation_source: 'purchase'
              });
          }
        }
      }
      
      await fetchBikes();
      await fetchBikeValuations();
      toast.success('Garage value updated!');
    } catch (error) {
      console.error('Error updating garage value:', error);
      toast.error('Failed to update garage value');
    } finally {
      setLoading(false);
    }
  };

  const valuateAllBikes = async () => {
    if (!canValuate) {
      toast.error('You can only valuate your garage twice per week. Please try again later.');
      return;
    }

    setIsValuating(true);
    let successCount = 0;
    let totalEstimated = 0;
    
    for (let i = 0; i < bikes.length; i++) {
      const bike = bikes[i];
      const isLastBike = i === bikes.length - 1;
      
      const result = await valuateBike(bike.id, isLastBike, totalEstimated, successCount + 1);
      if (result.success) {
        successCount++;
        totalEstimated += result.estimatedValue;
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsValuating(false);
    toast.success(`${successCount} bikes valued successfully`);
    
    // Refresh data and rate limit check
    await fetchBikes();
    await fetchBikeValuations();
    await fetchValuationHistory();
  };

  useEffect(() => {
    if (user) {
      fetchBikes();
      fetchBikeValuations();
      fetchValuationHistory();
    }
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

        <div className="flex flex-col gap-2 sm:flex-row">
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
          
          <Button
            onClick={updateGarageValue}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Update
          </Button>
          
          <Button
            onClick={() => setShowChart(!showChart)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Value overtime
          </Button>
        </div>

        {showChart && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Value Over Time</h4>
            </div>
            <div className="h-64">
              {(() => {
                // Always show full timeline from first bike purchase to today
                const bikesWithData = bikes.filter(bike => bike.price && bike.purchase_date);
                
                if (bikesWithData.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No bike value data available</p>
                        <p className="text-xs">Add purchase prices and dates to bikes to see the chart</p>
                      </div>
                    </div>
                  );
                }

                console.log('Building chart with bikes:', bikesWithData);
                console.log('Available valuations:', bikeValuations);

                // Create bike data with unique colors
                const colors = [
                  'hsl(var(--primary))',
                  'hsl(var(--destructive))', 
                  'hsl(var(--warning))',
                  'hsl(var(--success))',
                  '#8B5CF6', // Purple
                  '#F59E0B', // Amber
                  '#10B981', // Emerald
                  '#3B82F6', // Blue
                  '#EF4444', // Red
                  '#6366F1'  // Indigo
                ];

                // Create timeline data for each bike
                const bikeTimelines = bikesWithData.map((bike, index) => {
                  const bikeColor = colors[index % colors.length];
                  const dataPoints = [];

                  // Always add purchase point (start of timeline)
                  const purchaseDate = new Date(bike.purchase_date!);
                  dataPoints.push({
                    date: bike.purchase_date!,
                    timestamp: purchaseDate.getTime(),
                    value: bike.price!,
                    type: 'purchase'
                  });

                  // Add all valuation points for this bike
                  const bikeValuationsForThisBike = bikeValuations.filter(val => val.bike_id === bike.id);
                  bikeValuationsForThisBike.forEach(val => {
                    dataPoints.push({
                      date: val.valuation_date,
                      timestamp: new Date(val.valuation_date).getTime(),
                      value: val.estimated_value,
                      type: 'valuation'
                    });
                  });

                  // Sort points by timestamp
                  dataPoints.sort((a, b) => a.timestamp - b.timestamp);

                  return {
                    bike,
                    color: bikeColor,
                    dataPoints
                  };
                });

                // Get all unique timestamps for the chart
                const allTimestamps = new Set<number>();
                bikeTimelines.forEach(timeline => {
                  timeline.dataPoints.forEach(point => {
                    allTimestamps.add(point.timestamp);
                  });
                });

                const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
                
                if (sortedTimestamps.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No valuation data available</p>
                        <p className="text-xs">Run a valuation to see value changes over time</p>
                      </div>
                    </div>
                  );
                }

                // Build chart data - each timestamp becomes a data point
                const chartData = sortedTimestamps.map(timestamp => {
                  const chartPoint: any = {
                    date: new Date(timestamp).toLocaleDateString(),
                    timestamp
                  };

                  // For each bike, find current value at this timestamp
                  bikeTimelines.forEach(timeline => {
                    let currentValue = null;
                    
                    // Find most recent value for this bike at or before this timestamp
                    for (let i = timeline.dataPoints.length - 1; i >= 0; i--) {
                      if (timeline.dataPoints[i].timestamp <= timestamp) {
                        currentValue = timeline.dataPoints[i].value;
                        break;
                      }
                    }

                    // Only include bikes that have started (purchase date reached)
                    if (currentValue !== null) {
                      chartPoint[timeline.bike.name] = currentValue;
                    }
                  });

                  return chartPoint;
                });

                console.log('Chart data:', chartData);

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
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
                        formatter={(value: number, name: string) => [
                          `€${value.toLocaleString()}`, 
                          name
                        ]}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      {bikeTimelines.map((timeline, index) => (
                        <Line 
                          key={timeline.bike.id}
                          type="monotone" 
                          dataKey={timeline.bike.name}
                          stroke={timeline.color}
                          strokeWidth={2}
                          dot={{ fill: timeline.color, strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                );
              })()}
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