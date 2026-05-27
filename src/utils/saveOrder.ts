import { caseflowDb } from '@/integrations/supabase/caseflowClient';
import { OrderLine, FacadeType, Team } from '@/types/order';
import { checkDuplicate, insertOrder, updateOrder } from '@/utils/ordersGateway';

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
  case_id?: string;
  scheduledDelivery?: boolean;
  deliveryTime?: string | null;
}

export async function saveOrderToSupabase(params: SaveOrderParams) {
  const lineItems = params.lines.map(l => ({
    name: l.name,
    unit_price: l.unitPrice,
    quantity: l.quantity,
    sum: l.sum,
  }));

  console.log('[saveOrder] Saving order #', params.orderNumber);

  // Check if an order with this order_number already exists (update vs insert)
  const existing = await checkDuplicate({ order_number: params.orderNumber });

  const payload = {
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
      case_id: params.case_id || null,
      scheduled_delivery: !!params.scheduledDelivery,
      delivery_time: params.deliveryTime || null,
      // Nollställ ev. gammalt fakturanummer när ordern (åter)sparas som "order"
      // så att team-byte inte ärver fel prefix från tidigare fakturering.
      invoice_number: null,
      invoice_sent_at: null,
  } as Record<string, unknown>;

  let data;
  try {
    data = existing.exists && existing.id
      ? await updateOrder(existing.id, payload)
      : await insertOrder(payload);
  } catch (error) {
    console.error('[saveOrder] Failed to save order:', error);
    throw error;
  }
  console.log('[saveOrder] Saved successfully:', data);

  // Cross-DB sync: keep caseflow case in sync with delivery scheduling flag
  if (params.case_id) {
    try {
      await caseflowDb
        .from('cases')
        .update({
          scheduled_delivery: !!params.scheduledDelivery,
          delivery_time: params.deliveryTime || null,
        } as any)
        .eq('id', params.case_id);
    } catch (err) {
      console.warn('[saveOrder] Could not sync scheduled_delivery to caseflow:', err);
    }
  }

  return data;
}

