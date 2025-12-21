"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getUserStats } from "@/lib/visits"; // Tu función que ya calcula el total
import NetBalanceTable from "@/components/NetBalanceTable";
import Navigation from "@/components/navigation/Navigation";

export default function LoginPage() {
  const [income, setIncome] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // 1. Cargar los ingresos brutos del mes
  const loadIncomeData = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Obtenemos las estadísticas del usuario (donde está money_month)
      const stats = await getUserStats(user.id);
      setIncome(stats?.money_month || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadIncomeData();
  }, []);

  return (
    <>
      <Navigation />
      {!loading ? (
        <NetBalanceTable income={income} />
      ) : (
        <div className="mt-10 h-64 bg-white/[0.02] animate-pulse rounded-3xl border border-white/[0.08]" />
      )}
    </>
  );
}
