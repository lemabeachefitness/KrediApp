export type PlanName = 'free' | 'personal' | 'professional' | 'business';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: PlanName;
}

export interface Plan {
  name: string;
  price: string;
  color: string;
  limits: PlanLimits;
  features: string[];
}

export interface PlanLimits {
  clients: number | 'unlimited';
  loans: number | 'unlimited';
  accounts: number | 'unlimited';
}

export type LoanStatus = 'pending' | 'paid' | 'overdue';
export type LoanModality = 'Pagamento Único (Principal + Juros)' | 'Juros Mensal (+ Principal no final)' | 'Parcelado (Principal + Juros em X vezes)';

export interface InstallmentDetail {
  installment_number: number;
  amount: number;
  due_date: string; // ISO string
  status: 'pending' | 'paid';
  payment_date?: string; // ISO string
  amount_paid?: number;
}

export interface Loan {
  id: string;
  clientId: string;
  clientName?: string;
  account_id: string;
  amount_borrowed: number;
  amount_to_receive: number;
  interest_rate: number;
  daily_late_fee_amount: number;
  date: string; // ISO string for when the loan was made
  due_date: string; // ISO string
  payment_date?: string; // ISO string
  status: LoanStatus;
  is_ghost?: boolean;
  is_in_negotiation?: boolean;
  modality: LoanModality;
  installments?: number;
  installments_details?: InstallmentDetail[];
  promise_history?: { date: string; note: string; promised_due_date?: string }[];
  due_date_history?: { old_due_date: string; new_due_date: string; change_date: string }[];
  interest_payments_history?: { date: string; amount_paid: number }[];
  observation?: string;
  is_archived?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  cep: string;
  address: string;
  neighborhood: string;
  state: string;
}

export type BankName = 'itaú' | 'nubank' | 'inter' | 'bradesco' | 'caixa' | 'santander' | 'c6' | 'pessoal' | 'other';

export interface Account {
  id: string;
  name: string;
  bank: BankName;
  initial_balance: number;
  is_archived?: boolean;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Transaction {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string; // ISO String
}

export interface DeletionRecord {
  type: 'loan' | 'client' | 'account';
  action: 'archived' | 'deleted';
  name: string;
  date: string; // ISO String
}