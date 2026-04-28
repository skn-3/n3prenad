export interface OrderLine {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  sum: number;
}

export interface Order {
  date: string;
  orderNumber: number;
  customerAddress: string;
  customerCity: string;
  facadeType: 'tra' | 'sten' | 'puts';
  windowCount: number;
  doorCount: number;
  teamId: string;
  kmDistance: number;
  lines: OrderLine[];
  description: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  companyName: string;
  orgNr: string;
  address: string;
  email: string;
  invoiceEmail?: string;
  bankgiro: string;
  isActive: boolean;
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
}

export type FacadeType = 'tra' | 'sten' | 'puts';
