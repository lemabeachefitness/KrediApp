import type { Plan, PlanName, User, Loan, Client, Account, Transaction } from './types';

export const PLANS: Record<PlanName, Plan> = {
  free: {
    name: "Gratuito",
    price: "R$ 0",
    color: 'text-gray-500',
    limits: { clients: 5, loans: 10, accounts: 1 },
    features: ["Até 5 clientes", "Até 10 empréstimos", "1 conta bancária", "Relatórios básicos"]
  },
  personal: {
    name: "Pessoal",
    price: "R$ 19,90",
    color: 'text-blue-500',
    limits: { clients: 50, loans: 100, accounts: 5 },
    features: ["Até 50 clientes", "Até 100 empréstimos", "5 contas bancárias", "Relatórios completos"]
  },
  professional: {
    name: "Profissional",
    price: "R$ 49,90",
    color: 'text-purple-500',
    limits: { clients: 200, loans: 500, accounts: 10 },
    features: ["Até 200 clientes", "Até 500 empréstimos", "10 contas bancárias", "Análise Inteligente"]
  },
  business: {
    name: "Empresarial",
    price: "R$ 99,90",
    color: 'text-emerald-500',
    limits: { clients: 'unlimited', loans: 'unlimited', accounts: 'unlimited' },
    features: ["Clientes ilimitados", "Empréstimos ilimitados", "Contas ilimitadas", "Suporte prioritário"]
  }
};

export const MOCK_USER: User = {
    id: 'user-123',
    name: 'junior0309',
    email: 'junior@email.com',
    plan: 'business'
};

export const MOCK_CLIENTS: Client[] = [
    { id: 'client-1', name: 'Wendel Pettz', phone: '62984998751', email: 'wendel.p@example.com', city: 'Aparecida de Goiânia', cep: '74905-000', address: 'Av. das Nações', neighborhood: 'Centro', state: 'GO' },
    { id: 'client-2', name: 'Leticia Barbosa', phone: '62982106997', email: 'leticia.b@example.com', city: 'Goiânia', cep: '74000-000', address: 'Rua 1', neighborhood: 'Setor Bueno', state: 'GO' },
    { id: 'client-3', name: 'Vicente Duarte da Silva Junior', phone: '62994544387', email: 'vicente.d@example.com', city: 'Lagoa da Prata', cep: '35590-000', address: 'Av. Brasil', neighborhood: 'Centro', state: 'MG' },
    { id: 'client-4', name: 'Ana Costa', phone: '11988776655', email: 'ana.c@example.com', city: 'São Paulo', cep: '01000-000', address: 'Praça da Sé', neighborhood: 'Sé', state: 'SP' },
    { id: 'client-5', name: 'Roberto Almeida', phone: '21977665544', email: 'roberto.a@example.com', city: 'Rio de Janeiro', cep: '20000-000', address: 'Av. Rio Branco', neighborhood: 'Centro', state: 'RJ' },
    { id: 'client-6', name: 'Sofia Lima', phone: '31966554433', email: 'sofia.l@example.com', city: 'Belo Horizonte', cep: '30110-000', address: 'Av. Afonso Pena', neighborhood: 'Centro', state: 'MG' },
    { id: 'client-7', name: 'Mariana Ferreira', phone: '41955443322', email: 'mariana.f@example.com', city: 'Curitiba', cep: '80000-000', address: 'Rua XV de Novembro', neighborhood: 'Centro', state: 'PR' },
];

export const MOCK_ACCOUNTS: Account[] = [
    { id: 'acc-1', name: 'C6 Bank', bank: 'c6', initial_balance: 21000 },
    { id: 'acc-2', name: 'Cecilia', bank: 'pessoal', initial_balance: 0 },
    { id: 'acc-3', name: 'Pessoal', bank: 'pessoal', initial_balance: 15000 },
    { id: 'acc-4', name: 'Nubank', bank: 'nubank', initial_balance: 0 },
    { id: 'acc-5', name: 'CEF-Conta Principal', bank: 'caixa', initial_balance: 500 },
    { id: 'acc-6', name: 'Nubank 2', bank: 'nubank', initial_balance: 10000 },
];

const today = new Date();
today.setHours(0,0,0,0);
const setDate = (days: number, baseDate = today) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + days);
    return date.toISOString();
};

export const MOCK_LOANS: Loan[] = [
    { id: 'loan-1', clientId: 'client-1', account_id: 'acc-1', amount_borrowed: 1500, amount_to_receive: 1650, interest_rate: 10, daily_late_fee_amount: 15.0, date: setDate(-40), due_date: setDate(-10), status: 'overdue', modality: 'Pagamento Único (Principal + Juros)' },
    { id: 'loan-2', clientId: 'client-2', account_id: 'acc-3', amount_borrowed: 2000, amount_to_receive: 2200, interest_rate: 10, daily_late_fee_amount: 20.0, date: setDate(-35), due_date: setDate(2), status: 'pending', modality: 'Pagamento Único (Principal + Juros)' },
    { id: 'loan-3', clientId: 'client-3', account_id: 'acc-6', amount_borrowed: 5000, amount_to_receive: 5750, interest_rate: 15, daily_late_fee_amount: 30.0, date: setDate(-30), due_date: setDate(30), status: 'pending', modality: 'Pagamento Único (Principal + Juros)' },
    { id: 'loan-4', clientId: 'client-4', account_id: 'acc-1', amount_borrowed: 800, amount_to_receive: 900, interest_rate: 12.5, daily_late_fee_amount: 5.0, date: setDate(-25), due_date: setDate(-5), payment_date: setDate(-4), status: 'paid', modality: 'Pagamento Único (Principal + Juros)' },
    { id: 'loan-5', clientId: 'client-5', account_id: 'acc-5', amount_borrowed: 300, amount_to_receive: 330, interest_rate: 10, daily_late_fee_amount: 2.0, date: setDate(-20), due_date: setDate(-2), status: 'overdue', modality: 'Pagamento Único (Principal + Juros)', promise_history: [{date: setDate(-1), note: "Cliente prometeu pagar até o dia 15."}] },
    { id: 'loan-6', clientId: 'client-6', account_id: 'acc-3', amount_borrowed: 1200, amount_to_receive: 1350, interest_rate: 12.5, daily_late_fee_amount: 10.0, date: setDate(-15), due_date: setDate(-1), status: 'overdue', is_in_negotiation: true, modality: 'Pagamento Único (Principal + Juros)' },
    { id: 'loan-7', clientId: 'client-1', account_id: 'acc-1', amount_borrowed: 2500, amount_to_receive: 2800, interest_rate: 12, daily_late_fee_amount: 20.0, date: setDate(-10), due_date: setDate(80), status: 'pending', modality: 'Parcelado (Principal + Juros em X vezes)', installments: 3, 
      installments_details: [
        { installment_number: 1, amount: 933.33, due_date: setDate(20), status: 'pending'},
        { installment_number: 2, amount: 933.33, due_date: setDate(50), status: 'pending'},
        { installment_number: 3, amount: 933.34, due_date: setDate(80), status: 'pending'}
      ]
    },
    { id: 'loan-8', clientId: 'client-2', account_id: 'acc-4', amount_borrowed: 1000, amount_to_receive: 1100, interest_rate: 10, daily_late_fee_amount: 10.0, date: setDate(-5), due_date: setDate(25), status: 'pending', modality: 'Pagamento Único (Principal + Juros)' },
    // Data for charts (past months)
    { id: 'loan-9', clientId: 'client-7', account_id: 'acc-1', amount_borrowed: 1800, amount_to_receive: 2000, interest_rate: 11.1, daily_late_fee_amount: 15.0, date: setDate(-50), due_date: setDate(-20), payment_date: setDate(-19), status: 'paid', modality: 'Pagamento Único (Principal + Juros)' },
    { id: 'loan-10', clientId: 'client-3', account_id: 'acc-6', amount_borrowed: 4000, amount_to_receive: 4500, interest_rate: 12.5, daily_late_fee_amount: 25.0, date: setDate(-80), due_date: setDate(-50), payment_date: setDate(-51), status: 'paid', modality: 'Pagamento Único (Principal + Juros)' },
    { id: 'loan-11', clientId: 'client-5', account_id: 'acc-1', amount_borrowed: 2200, amount_to_receive: 2500, interest_rate: 13.6, daily_late_fee_amount: 20.0, date: setDate(-110), due_date: setDate(-80), payment_date: setDate(-80), status: 'paid', modality: 'Pagamento Único (Principal + Juros)' },
    { id: 'loan-12', clientId: 'client-4', account_id: 'acc-3', amount_borrowed: 3000, amount_to_receive: 3300, interest_rate: 10, daily_late_fee_amount: 20.0, date: setDate(-140), due_date: setDate(-110), payment_date: setDate(-112), status: 'paid', modality: 'Pagamento Único (Principal + Juros)' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
    { id: 'txn-1', accountId: 'acc-1', description: 'Salário', amount: 5000, type: 'credit', date: setDate(-28) },
    { id: 'txn-2', accountId: 'acc-1', description: 'Pagamento Aluguel', amount: 1200, type: 'debit', date: setDate(-25) },
    { id: 'txn-3', accountId: 'acc-3', description: 'Aporte Pessoal', amount: 1000, type: 'credit', date: setDate(-15) },
    { id: 'txn-4', accountId: 'acc-1', description: 'Pagamento Energia', amount: 250, type: 'debit', date: setDate(-5) },
];