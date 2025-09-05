
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BikeComponent {
  id: string;
  bike_id: string;
  current_distance: number;
  replacement_distance: number;
  component_type: {
    name: string;
  };
  bikes: {
    name: string;
  };
}

export const GarageConditionWidget = () => {
  const { user } = useAuth();
  const [components, setComponents] = useState<BikeComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageCondition, setAverageCondition] = useState(0);
  const [conditionBreakdown, setConditionBreakdown] = useState({
    excellent: 0,
    good: 0,
    warning: 0,
    critical: 0,
  });

  const fetchComponents = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bike_components')
        .select(`
          id,
          bike_id,
          current_distance,
          replacement_distance,
          component_type:component_types(name),
          bikes!inner(name, user_id)
        `)
        .eq('bikes.user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      setComponents(data || []);
      calculateConditions(data || []);
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateConditions = (components: BikeComponent[]) => {
    if (components.length === 0) {
      setAverageCondition(100);
      return;
    }

    let totalCondition = 0;
    const breakdown = {
      excellent: 0,
      good: 0,
      warning: 0,
      critical: 0,
    };

    components.forEach((component) => {
      const usagePercentage = (component.current_distance / component.replacement_distance) * 100;
      const remainingCondition = Math.max(0, 100 - usagePercentage);
      
      totalCondition += remainingCondition;

      if (usagePercentage >= 90) {
        breakdown.critical++;
      } else if (usagePercentage >= 70) {
        breakdown.warning++;
      } else if (usagePercentage >= 30) {
        breakdown.good++;
      } else {
        breakdown.excellent++;
      }
    });

    const average = totalCondition / components.length;
    setAverageCondition(Math.round(average));
    setConditionBreakdown(breakdown);
  };

  useEffect(() => {
    if (user) {
      fetchComponents();
    }
  }, [user]);

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-white/30 dark:bg-black/30 border border-gray-200 dark:border-gray-800">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConditionColor = (condition: number) => {
    if (condition >= 70) return "text-green-600";
    if (condition >= 50) return "text-yellow-600";
    if (condition >= 30) return "text-orange-600";
    return "text-red-600";
  };

  const getConditionIcon = (condition: number) => {
    if (condition >= 70) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (condition >= 50) return <Clock className="w-5 h-5 text-yellow-600" />;
    if (condition >= 30) return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    return <Wrench className="w-5 h-5 text-red-600" />;
  };

  return (
    <Card className="backdrop-blur-sm bg-white/30 dark:bg-black/30 border border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getConditionIcon(averageCondition)}
          Garage Condition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-4xl font-bold ${getConditionColor(averageCondition)}`}>
            {averageCondition}%
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Average Component Health
          </p>
        </div>

        {components.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Excellent
                </span>
                <span className="font-medium">{conditionBreakdown.excellent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Good
                </span>
                <span className="font-medium">{conditionBreakdown.good}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  Warning
                </span>
                <span className="font-medium">{conditionBreakdown.warning}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  Critical
                </span>
                <span className="font-medium">{conditionBreakdown.critical}</span>
              </div>
            </div>

            {conditionBreakdown.critical > 0 && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  {conditionBreakdown.critical} component{conditionBreakdown.critical > 1 ? 's' : ''} need immediate attention
                </p>
              </div>
            )}

            {conditionBreakdown.warning > 0 && conditionBreakdown.critical === 0 && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <Clock className="w-4 h-4 inline mr-1" />
                  {conditionBreakdown.warning} component{conditionBreakdown.warning > 1 ? 's' : ''} approaching replacement
                </p>
              </div>
            )}
          </>
        )}

        {components.length === 0 && (
          <p className="text-center text-muted-foreground text-sm">
            No components tracked yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};
