


import React, { useMemo, useState } from 'react';
import { Card, Button, Modal, getTodayInBrasilia, formatDateForBrasilia } from './Shared';
import type { Loan, Account, Client, Transaction } from '../types';
import { getFinancialAnalysis } from '../services/geminiService';
import { GemIcon, AlertTriangleIcon, BankIcon, CheckCircleIcon } from './Icons';
import Markdown from 'react-markdown';
// FIX: Added LabelList to recharts import.
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Label, LabelList } from 'recharts';


interface DashboardProps {
  loans: Loan[];
  accounts: Account[];
  clients: Client[];
  transactions: Transaction[];
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  
const ChartCard: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <Card>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{title}</h3>
        <div style={{width: '100%', height: 300}}>
            {children}
        </div>
    </Card>
);

export const Dashboard: React.FC<DashboardProps> = ({ loans, accounts, clients, transactions }) => {
  
  const financialSummary = useMemo(() => {
     const openLoans = loans.filter(l => l.status !== 'paid');
     const today = getTodayInBrasilia();
     
     const pendingLoans = openLoans.filter(l => {
         const dueDate = new Date(l.due_date.split('T')[0] + 'T00:00:00');
         return dueDate >= today;
     });
     
     const overdueLoans = openLoans.filter(l => {
         const dueDate = new Date(l.due_date.split('T')[0] + 'T00:00:00');
         return dueDate < today;
     });
     
     const totalCapital = accounts.reduce((total, account) => {
        const accountTransactions = transactions.filter(t => t.accountId === account.id);
        const balance = account.initial_balance + accountTransactions.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
        return total + balance;
     }, 0);
     
     const accountBalances = accounts.reduce((acc, account) => {
        const accountTransactions = transactions.filter(t => t.accountId === account.id);
        const balance = account.initial_balance + accountTransactions.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
        acc[account.id] = balance;
        return acc;
     }, {} as Record<string, number>);
     
     const next7DaysReceivables = openLoans.filter(loan => {
        const dueDate = new Date(loan.due_date.split('T')[0] + 'T00:00:00');
        const aWeekFromNow = new Date(today);
        aWeekFromNow.setDate(today.getDate() + 7);
        return dueDate >= today && dueDate <= aWeekFromNow;
     }).reduce((sum, loan) => {
        if(loan.modality === 'Parcelado (Principal + Juros em X vezes)'){
            const nextInstallment = loan.installments_details?.find(i => i.status === 'pending');
            return sum + (nextInstallment?.amount || 0);
        }
        return sum + loan.amount_to_receive;
     }, 0);

     return {
        pendingLoans,
        overdueLoans,
        accountBalances,
        totalCapital,
        next7DaysReceivables,
        openLoansCount: openLoans.length,
        totalReceivables: openLoans.reduce((sum, l) => sum + l.amount_to_receive, 0),
     };
  }, [loans, accounts, transactions]);
  
  // Chart Data Calcs
  const loanEvolutionData = useMemo(() => {
      const data: { [key: string]: number } = {};
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      for (let i = 0; i < 6; i++) {
          const date = new Date(sixMonthsAgo);
          date.setMonth(date.getMonth() + i);
          const monthKey = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
          data[monthKey] = 0;
      }

      loans.forEach(loan => {
          const loanDate = new Date(loan.date);
          if (loanDate >= sixMonthsAgo) {
              const monthKey = loanDate.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
              if (data[monthKey] !== undefined) {
                  data[monthKey] += loan.amount_borrowed;
              }
          }
      });
      return Object.entries(data).map(([name, value]) => ({ name, 'Empréstimos Concedidos (R$)': value }));
  }, [loans]);
  
  const cashFlowData = useMemo(() => {
      const today = getTodayInBrasilia();
      const data = [
          { name: 'Sem 1', 'Recebimentos (R$)': 0 },
          { name: 'Sem 2', 'Recebimentos (R$)': 0 },
          { name: 'Sem 3', 'Recebimentos (R$)': 0 },
          { name: 'Sem 4', 'Recebimentos (R$)': 0 },
      ];

      loans.filter(l => l.status !== 'paid').forEach(loan => {
          const dueDate = new Date(loan.due_date.split('T')[0] + 'T00:00:00');
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          if (diffDays >= 0 && diffDays < 7) data[0]['Recebimentos (R$)'] += loan.amount_to_receive;
          else if (diffDays >= 7 && diffDays < 14) data[1]['Recebimentos (R$)'] += loan.amount_to_receive;
          else if (diffDays >= 14 && diffDays < 21) data[2]['Recebimentos (R$)'] += loan.amount_to_receive;
          else if (diffDays >= 21 && diffDays < 28) data[3]['Recebimentos (R$)'] += loan.amount_to_receive;
      });

      return data;
  }, [loans]);
  
  const loanStatusData = useMemo(() => {
      const paid = loans.filter(l => l.status === 'paid').length;
      return [
        { name: 'Atrasados', value: financialSummary.overdueLoans.length }, 
        { name: 'Pendentes', value: financialSummary.pendingLoans.length },
        { name: 'Pagos', value: paid }
    ];
  }, [loans, financialSummary]);

  const topClientsData = useMemo(() => {
      const clientReceivables: { [key: string]: number } = {};
      [...financialSummary.pendingLoans, ...financialSummary.overdueLoans].forEach(loan => {
          if (!clientReceivables[loan.clientId]) clientReceivables[loan.clientId] = 0;
          clientReceivables[loan.clientId] += loan.amount_to_receive;
      });

      return Object.entries(clientReceivables)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([clientId, total]) => ({
              name: clients.find(c => c.id === clientId)?.name || 'Desconhecido',
              'Total a Receber': total,
          })).reverse();
  }, [financialSummary.pendingLoans, financialSummary.overdueLoans, clients]);

  const STATUS_COLORS = ['#ef4444', '#f59e0b', '#22c55e'];


  return (
    <div className="space-y-6">
      <PendingReminder overdueLoans={financialSummary.overdueLoans} pendingLoans={financialSummary.pendingLoans} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <IntelligentAnalysis summary={financialSummary} />
        </div>
        <div className="lg:col-span-2">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {accounts.map(account => (
                  <AccountSummaryCard 
                    key={account.id} 
                    account={account} 
                    currentBalance={financialSummary.accountBalances[account.id]} 
                  />
                ))}
            </div>
        </div>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Evolução de Empréstimos (Últimos 6 meses)">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={loanEvolutionData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                        <XAxis dataKey="name" stroke="rgb(156 163 175)" />
                        <YAxis tickFormatter={(val) => `${(val/1000)}k`} stroke="rgb(156 163 175)" />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                        <Legend />
                        <Line type="monotone" dataKey="Empréstimos Concedidos (R$)" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>
            
            <ChartCard title="Fluxo de Caixa Previsto (Próximos 30 dias)">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                        <XAxis dataKey="name" stroke="rgb(156 163 175)" />
                        <YAxis tickFormatter={(val) => `${(val/1000)}k`} stroke="rgb(156 163 175)"/>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                        <Legend />
                        <Bar dataKey="Recebimentos (R$)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status dos Empréstimos">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={loanStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={90} fill="#8884d8" paddingAngle={5}>
                             {loanStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                            ))}
                             <Label value={`${financialSummary.openLoansCount} em Aberto`} position="center" className="fill-gray-700 dark:fill-gray-200 text-lg font-semibold"/>
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value} empréstimos`, name]} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </ChartCard>
            
             <ChartCard title="Top 5 Clientes (A Receber)">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topClientsData} layout="vertical" margin={{ top: 5, right: 50, left: 50, bottom: 5 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                        <XAxis type="number" tickFormatter={formatCurrency} stroke="rgb(156 163 175)"/>
                        <YAxis type="category" dataKey="name" width={100} stroke="rgb(156 163 175)"/>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: '#4b5563' }} />
                        <Bar dataKey="Total a Receber" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                            {topClientsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#f59e0b" />
                            ))}
                            <LabelList dataKey="Total a Receber" position="right" formatter={(value: number) => formatCurrency(value)} className="fill-gray-700 dark:fill-gray-200 text-xs font-semibold" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
        </div>
    </div>
  );
};

const PendingReminder: React.FC<{overdueLoans: Loan[], pendingLoans: Loan[]}> = ({overdueLoans, pendingLoans}) => {
  const overdueCount = overdueLoans.length;
  const overdueTotal = overdueLoans.reduce((sum, l) => sum + l.amount_to_receive, 0);
  const pendingCount = pendingLoans.length;
  const pendingTotal = pendingLoans.reduce((sum, l) => sum + l.amount_to_receive, 0);
  
  if (overdueCount === 0 && pendingCount === 0) return null;

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Lembretes Importantes</h3>
      <div className='space-y-3'>
        {overdueCount > 0 && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 rounded-r-md">
            <div className="flex items-center">
              <AlertTriangleIcon className="h-5 w-5 text-red-500 mr-3" />
              <div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                      Você tem <strong>{overdueCount} empréstimo(s) atrasado(s)</strong>, totalizando <strong>{formatCurrency(overdueTotal)}</strong> a receber.
                  </p>
              </div>
            </div>
          </div>
        )}
        {pendingCount > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded-r-md">
                <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-yellow-500 mr-3" />
                    <div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                            Você tem <strong>{pendingCount} empréstimo(s) pendente(s)</strong>, totalizando <strong>{formatCurrency(pendingTotal)}</strong> a receber.
                        </p>
                    </div>
                </div>
            </div>
        )}
      </div>
    </Card>
  );
};

const AccountSummaryCard: React.FC<{account: Account; currentBalance: number}> = ({ account, currentBalance }) => {
    return (
        <Card className="flex items-start space-x-4">
            <BankIcon bank={account.bank} />
            <div className='flex-1'>
                <div className='flex justify-between items-start'>
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100">{account.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Saldo Inicial: {formatCurrency(account.initial_balance)}</p>
                    </div>
                </div>
                <p className={`text-2xl font-bold mt-2 ${currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatCurrency(currentBalance)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Atual</p>
            </div>
        </Card>
    );
}

const IntelligentAnalysis: React.FC<{summary: any}> = ({summary}) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);

    const handleAnalysis = async () => {
        setIsLoading(true);
        const result = await getFinancialAnalysis(
            summary.totalCapital,
            summary.totalReceivables,
            summary.overdueLoans.length,
            summary.openLoansCount
        );
        setAnalysis(result);
        setIsLoading(false);
        setModalOpen(true);
    }
    
    const suggestionText = `Seu capital de giro está ${summary.totalCapital > 10000 ? 'saudável' : 'apertado'}. Você tem aproximadamente ${formatCurrency(summary.totalCapital)} disponíveis para novos empréstimos na próxima semana.`;

    return (
        <Card>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Análise Inteligente</h2>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                <div className='flex justify-between items-center text-sm'>
                    <span className='text-gray-600 dark:text-gray-300'>Saldo Total em Contas:</span>
                    <span className='font-bold text-gray-800 dark:text-gray-100'>{formatCurrency(summary.totalCapital)}</span>
                </div>
                 <div className='flex justify-between items-center text-sm'>
                    <span className='text-gray-600 dark:text-gray-300'>A receber (7 dias - parcela):</span>
                    <span className='font-bold text-gray-800 dark:text-gray-100'>{formatCurrency(summary.next7DaysReceivables)}</span>
                </div>
            </div>
            <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300"><strong className="text-gray-800 dark:text-gray-100">Sugestão: </strong>{suggestionText}</p>
            </div>
            
            <Button onClick={handleAnalysis} disabled={isLoading} className="mt-4 w-full flex items-center justify-center gap-2">
                <GemIcon className='w-4 h-4' />
                {isLoading ? 'Analisando...' : 'Gerar Análise com IA'}
            </Button>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Análise Financeira e Sugestões">
                 <div className="prose prose-sm dark:prose-invert max-w-none">
                     <Markdown>{analysis}</Markdown>
                 </div>
            </Modal>
        </Card>
    );
}