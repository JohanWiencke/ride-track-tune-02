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
      const originalTotal = data?.reduce((sum, bike) => sum + (bike.price || 0), 0)
