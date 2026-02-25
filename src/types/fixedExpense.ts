export interface FixedExpense {
  id: string;
  nombre: string;
  monto: number;
  activo?: boolean;
  created_at?: string;
}