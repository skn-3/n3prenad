import { supabase } from '@/integrations/supabase/client';
import { OrderLine, FacadeType, Team } from '@/types/order';

interface SaveOrderParams {
  orderNumber: number;
  date: string;
  customerAddress: string;
  customerName: string;
  customerPhone: string;
  facadeType: FacadeType;
  windowCount: number;
  doorCount: number;
  teamId: string;
  team: Team;
  kmDistance: number;
  lines: OrderLine[];
  description: string;
  totalAmount: number;
}

export async function saveOrderToSupabase(params: SaveOrderParams) {
  const lineItems = params.lines.map(l => ({
    name: l.name,
    unit_price: l.unitPrice,
    quantity: l.quantity,
    sum: l.sum,
  }));

  const { error } = await supabase.from('orders').upsert(
    {
      order_number: params.orderNumber,
      date: params.date,
      customer_address: params.customerAddress,
      customer_name: params.customerName || null,
      customer_phone: params.customerPhone || null,
      facade_type: params.facadeType,
      windows_count: params.windowCount,
      doors_count: params.doorCount,
      team_id: params.teamId,
      team_company: params.team.companyName,
      team_org_nr: params.team.orgNr,
      team_bankgiro: params.team.bankgiro,
      team_email: params.team.email,
      distance_km: params.kmDistance,
      line_items: lineItems,
      description: params.description,
      total_amount: params.totalAmount,
      status: 'order',
    } as any,
    { onConflict: 'order_number', ignoreDuplicates: false }
  );

  if (error) {
    console.error('Failed to save order:', error);
    throw error;
  }
}
