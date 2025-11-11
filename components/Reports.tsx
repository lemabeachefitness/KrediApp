import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Card, Button, Modal, formatDateForBrasilia, getTodayInBrasilia } from './Shared';
import type { Loan, Client, Transaction, Account, InstallmentDetail, DeletionRecord } from '../types';
import { CheckCircleIcon, TrashIcon, UserCircleIcon, BanknoteIcon } from './Icons';

interface ReportsPageProps {
  loans: Loan[];
  clients: Client[];
  transactions: Transaction[];
  accounts: Account[];
  deletionHistory: DeletionRecord[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const inputStyle = "w-full sm:w-auto mt-1 px-3 py-2 text-gray-800 bg-white border border-gray-300 rounded-md dark:bg-gray-900 dark:text-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm";

/**
 * Calculates the current total outstanding balance for a given loan,
 * including any applicable late fees for overdue payments or installments.
 * @param loan The loan object.
 * @returns The total current amount to be received for the loan.
 */
const calculateCurrentOutstandingBalance = (loan: Loan): number => {
    if (loan.status === 'paid' || loan.is_archived) {
        return 0;
    }

    const today = getTodayInBrasilia();
    
    if (loan.modality === 'Parcelado (Principal + Juros em X vezes)' && loan.installments_details) {
        return loan.installments_details.reduce((total, installment) => {
            if (installment.status === 'paid') {
                return total;
            }
            
            const installmentDueDate = new Date(installment.due_date.split('T')[0] + 'T00:00:00');
            let lateFee = 0;
            if (installmentDueDate < today) {
                const daysOverdue = Math.floor((today.getTime() - installmentDueDate.getTime()) / (1000 * 60 * 60 * 24));
                lateFee = daysOverdue * (loan.daily_late_fee_amount || 0);
            }
            
            return total + installment.amount + lateFee;
        }, 0);
    }
    
    const dueDate = new Date(loan.due_date.split('T')[0] + 'T00:00:00');
    let lateFee = 0;
    if (dueDate < today) {
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        lateFee = daysOverdue * (loan.daily_late_fee_amount || 0);
    }

    // For Juros Mensal, the outstanding is the principal + the current interest payment + fees
    if (loan.modality === 'Juros Mensal (+ Principal no final)') {
        return loan.amount_borrowed + loan.amount_to_receive + lateFee;
    }

    // For Pagamento Único
    return loan.amount_to_receive + lateFee;
};


// Reusable Filter Component
const ReportFilters: React.FC<{
    clients: Client[];
    onFilterChange: (filters: { clientId: string; startDate: string; endDate: string }) => void;
    showClientFilter?: boolean;
    showDateFilter?: boolean;
}> = ({ clients, onFilterChange, showClientFilter = true, showDateFilter = true }) => {
    const [clientId, setClientId] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        onFilterChange({ clientId, startDate, endDate });
    }, [clientId, startDate, endDate]);

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-6 flex flex-col sm:flex-row gap-4 items-center flex-wrap">
            {showClientFilter && (
                <div>
                    <label htmlFor="clientFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por Cliente</label>
                    <select id="clientFilter" value={clientId} onChange={e => setClientId(e.target.value)} className={inputStyle}>
                        <option value="all">Todos os Clientes</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            )}
            {showDateFilter && (
                <>
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Inicial</label>
                        <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Final</label>
                        <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputStyle} />
                    </div>
                </>
            )}
        </div>
    );
};


export const ReportsPage: React.FC<ReportsPageProps> = ({ loans, clients, transactions, accounts, deletionHistory }) => {
    const [activeReport, setActiveReport] = useState<null | 'delinquency' | 'cashflow' | 'profitability' | 'byClient' | 'installments' | 'deletionHistory' | 'modalitySummary'>(null);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Relatórios Gerenciais</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 <Card title="Relatório de Inadimplência">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Visualize todos os empréstimos em atraso, com cálculo de mora e total devido.</p>
                    <Button onClick={() => setActiveReport('delinquency')} className="w-full">Gerar Relatório</Button>
                 </Card>
                 <Card title="Fluxo de Caixa Detalhado">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Acompanhe todas as entradas e saídas, com opção de filtro por conta.</p>
                    <Button onClick={() => setActiveReport('cashflow')} className="w-full">Gerar Relatório</Button>
                 </Card>
                 <Card title="Controle de Parcelas">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Relatório de rastreabilidade de parcelas pagas, pendentes e atrasadas.</p>
                    <Button onClick={() => setActiveReport('installments')} className="w-full">Gerar Relatório</Button>
                 </Card>
                 <Card title="Relatório de Rentabilidade">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Analise o capital emprestado, o retorno obtido e a rentabilidade geral do seu negócio.</p>
                    <Button onClick={() => setActiveReport('profitability')} className="w-full">Gerar Relatório</Button>
                 </Card>
                  <Card title="Empréstimos por Cliente">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Resumo financeiro por cliente, incluindo total emprestado, pago e pendente.</p>
                    <Button onClick={() => setActiveReport('byClient')} className="w-full">Gerar Relatório</Button>
                 </Card>
                 <Card title="Resumo por Modalidade">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Veja um resumo financeiro de empréstimos em aberto, agrupados por modalidade.</p>
                    <Button onClick={() => setActiveReport('modalitySummary')} className="w-full">Gerar Relatório</Button>
                </Card>
                 <Card title="Histórico de Exclusões">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Auditoria de todos os empréstimos, clientes e contas que foram arquivados ou excluídos.</p>
                    <Button onClick={() => setActiveReport('deletionHistory')} className="w-full">Gerar Relatório</Button>
                 </Card>
            </div>
            
            <DelinquencyReportModal 
                isOpen={activeReport === 'delinquency'}
                onClose={() => setActiveReport(null)}
                loans={loans}
                clients={clients}
            />

            <CashFlowReportModal 
                isOpen={activeReport === 'cashflow'}
                onClose={() => setActiveReport(null)}
                transactions={transactions}
                accounts={accounts}
            />
            
            <ProfitabilityReportModal
                isOpen={activeReport === 'profitability'}
                onClose={() => setActiveReport(null)}
                loans={loans}
                clients={clients}
            />

            <LoansByClientReportModal
                isOpen={activeReport === 'byClient'}
                onClose={() => setActiveReport(null)}
                loans={loans}
                clients={clients}
            />
            
            <InstallmentReportModal
                isOpen={activeReport === 'installments'}
                onClose={() => setActiveReport(null)}
                loans={loans}
                clients={clients}
            />

            <ModalitySummaryReportModal
                isOpen={activeReport === 'modalitySummary'}
                onClose={() => setActiveReport(null)}
                loans={loans}
                clients={clients}
            />

            <DeletionHistoryModal
                isOpen={activeReport === 'deletionHistory'}
                onClose={() => setActiveReport(null)}
                history={deletionHistory}
            />

        </div>
    );
};


const DelinquencyReportModal: React.FC<{isOpen: boolean, onClose: () => void, loans: Loan[], clients: Client[]}> = ({isOpen, onClose, loans, clients}) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [filters, setFilters] = useState({ clientId: 'all', startDate: '', endDate: '' });

    const overdueItems = useMemo(() => {
        const today = getTodayInBrasilia();
        let items: any[] = [];

        loans.forEach(loan => {
            if (loan.is_archived || loan.status === 'paid') return;

            // Handle Installment Loans
            if (loan.modality === 'Parcelado (Principal + Juros em X vezes)' && loan.installments_details) {
                loan.installments_details.forEach(inst => {
                    const dueDate = new Date(inst.due_date.split('T')[0] + 'T00:00:00');
                    if (inst.status === 'pending' && dueDate < today) {
                        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));
                        // Apply the parent loan's daily fee to the overdue installment
                        const lateFee = daysOverdue * loan.daily_late_fee_amount;
                        items.push({
                            id: `${loan.id}-${inst.installment_number}`,
                            clientName: loan.clientName,
                            dueDate: inst.due_date,
                            daysOverdue,
                            originalAmount: inst.amount,
                            lateFee,
                            totalToReceive: inst.amount + lateFee,
                            clientId: loan.clientId,
                            description: `Parcela ${inst.installment_number}`
                        });
                    }
                });
            }
            // Handle Single Payment / Monthly Interest Loans
            else {
                const dueDate = new Date(loan.due_date.split('T')[0] + 'T00:00:00');
                if (dueDate < today) {
                    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));
                    const lateFee = daysOverdue * loan.daily_late_fee_amount;
                    items.push({
                        id: loan.id,
                        clientName: loan.clientName,
                        dueDate: loan.due_date,
                        daysOverdue,
                        originalAmount: loan.amount_to_receive,
                        lateFee,
                        totalToReceive: loan.amount_to_receive + lateFee,
                        clientId: loan.clientId,
                        description: 'Pagamento Único'
                    });
                }
            }
        });

        // Apply filters
        return items.filter(item => {
            const clientMatch = filters.clientId === 'all' || item.clientId === filters.clientId;
            const itemDueDate = new Date(item.dueDate.split('T')[0] + 'T00:00:00');
            const dateMatch = (!filters.startDate || itemDueDate >= new Date(filters.startDate + 'T00:00:00')) &&
                              (!filters.endDate || itemDueDate <= new Date(filters.endDate + 'T23:59:59'));
            return clientMatch && dateMatch;
        }).sort((a, b) => b.totalToReceive - a.totalToReceive);

    }, [loans, filters]);
    
    const delinquentClients = useMemo(() => {
        const clientData: Record<string, { count: number, total: number }> = {};
        overdueItems.forEach(item => {
            if(!clientData[item.clientId]) clientData[item.clientId] = { count: 0, total: 0 };
            clientData[item.clientId].count++;
            clientData[item.clientId].total += item.totalToReceive;
        });
        return Object.entries(clientData).map(([clientId, data]) => ({
            name: clients.find(c => c.id === clientId)?.name || 'Desconhecido',
            ...data
        })).sort((a,b) => b.total - a.total);
    }, [overdueItems, clients]);
    
    const handlePrint = () => {
        const printContent = reportRef.current;
        if (printContent) {
            const WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
            WinPrint?.document.write(`<html><head><title>Relatório de Inadimplência</title><style>body{font-family:sans-serif;}.print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; } .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; } .print-table th { background-color: #f2f2f2; } h3 { font-size: 1.2em; margin-bottom: 10px; }</style></head><body>${printContent.innerHTML}</body></html>`);
            WinPrint?.document.close();
            WinPrint?.focus();
            WinPrint?.print();
            WinPrint?.close();
        }
    }
    
    const thStyle = "px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Relatório de Inadimplência" size='2xl' footer={
            <div className="flex justify-end">
                <Button onClick={handlePrint}>Imprimir Relatório</Button>
            </div>
        }>
            <ReportFilters clients={clients} onFilterChange={setFilters} />
             <div className="printable-report" ref={reportRef}>
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Itens Atrasados</h3>
                <div className="mb-6">
                    {/* Mobile View */}
                    <div className="sm:hidden space-y-3">
                        {overdueItems.map(item => (
                            <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow">
                                <p className='font-bold text-sm'>{item.clientName} <span className='font-normal text-xs'>({item.description})</span></p>
                                <p className='text-xs'>Venc: {formatDateForBrasilia(item.dueDate)} ({item.daysOverdue} dias)</p>
                                <div className='mt-2 pt-2 border-t dark:border-gray-600 text-xs'>
                                    <p>Original: {formatCurrency(item.originalAmount)}</p>
                                    <p className='text-red-500'>Mora: {formatCurrency(item.lateFee)}</p>
                                    <p className='font-bold text-sm'>Total: {formatCurrency(item.totalToReceive)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Desktop View */}
                    <div className="overflow-x-auto hidden sm:block">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className={thStyle}>Cliente</th>
                                    <th className={thStyle}>Vencimento</th>
                                    <th className={`${thStyle} text-center`}>Dias Atraso</th>
                                    <th className={`${thStyle} text-right`}>Valor Original</th>
                                    <th className={`${thStyle} text-right`}>Mora</th>
                                    <th className={`${thStyle} text-right`}>Total a Receber</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {overdueItems.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap font-medium">{item.clientName} <span className='text-xs text-gray-500'>({item.description})</span></td>
                                        <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap">{formatDateForBrasilia(item.dueDate)}</td>
                                        <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap text-center">{item.daysOverdue}</td>
                                        <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap text-right">{formatCurrency(item.originalAmount)}</td>
                                        <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap text-right text-red-500">{formatCurrency(item.lateFee)}</td>
                                        <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap text-right font-bold">{formatCurrency(item.totalToReceive)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {overdueItems.length === 0 && <p className="text-center py-4 text-gray-500">Nenhum item em atraso para os filtros selecionados.</p>}
                </div>
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Clientes Inadimplentes</h3>
                <div>
                     {/* Mobile view */}
                     <div className='sm:hidden space-y-3'>
                        {delinquentClients.map(c => (
                            <div key={c.name} className='flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow'>
                                <p className='font-bold text-sm'>{c.name}</p>
                                <p className='font-bold text-base'>{formatCurrency(c.total)}</p>
                            </div>
                        ))}
                     </div>
                     {/* Desktop view */}
                     <div className="overflow-x-auto hidden sm:block">
                         <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className={thStyle}>Cliente</th>
                                    <th className={`${thStyle} text-right`}>Total Devido</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {delinquentClients.map(c => (
                                    <tr key={c.name}>
                                        <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap font-medium">{c.name}</td>
                                        <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap text-right font-bold">{formatCurrency(c.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {delinquentClients.length === 0 && <p className="text-center py-4 text-gray-500">Nenhum cliente inadimplente para os filtros selecionados.</p>}
                </div>
            </div>
        </Modal>
    );
}

interface DailyFlowGroup {
    transactions: (Transaction & {credit: number; debit: number})[];
    dailyCredit: number;
    dailyDebit: number;
    netChange: number;
}
const CashFlowReportModal: React.FC<{isOpen: boolean, onClose: () => void, transactions: Transaction[], accounts: Account[]}> = ({isOpen, onClose, transactions, accounts}) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [selectedAccountId, setSelectedAccountId] = useState('all');
    
    const { groupedItems, totalCredit, totalDebit, netTotal } = useMemo(() => {
        const filteredTransactions = selectedAccountId === 'all' ? transactions : transactions.filter(t => t.accountId === selectedAccountId);

        const itemsWithCreditDebit = filteredTransactions.map(t => ({
            ...t,
            credit: t.type === 'credit' ? t.amount : 0,
            debit: t.type === 'debit' ? t.amount : 0,
        }));
        
        itemsWithCreditDebit.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const grouped = itemsWithCreditDebit.reduce((acc: Record<string, DailyFlowGroup>, item) => {
            const dateKey = formatDateForBrasilia(item.date);
            if (!acc[dateKey]) {
                acc[dateKey] = { transactions: [], dailyCredit: 0, dailyDebit: 0, netChange: 0 };
            }
            acc[dateKey].transactions.push(item);
            acc[dateKey].dailyCredit += item.credit;
            acc[dateKey].dailyDebit += item.debit;
            acc[dateKey].netChange = acc[dateKey].dailyCredit - acc[dateKey].dailyDebit;
            return acc;
        }, {} as Record<string, DailyFlowGroup>);
        
        const totalCredit = filteredTransactions.reduce((sum, i) => sum + (i.type === 'credit' ? i.amount : 0), 0);
        const totalDebit = filteredTransactions.reduce((sum, i) => sum + (i.type === 'debit' ? i.amount : 0), 0);

        return { groupedItems: Object.entries(grouped), totalCredit, totalDebit, netTotal: totalCredit - totalDebit };
    }, [transactions, selectedAccountId]);

    const handlePrint = () => {
        const printContent = reportRef.current;
        if (printContent) {
            const WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
            WinPrint?.document.write(`<html><head><title>Fluxo de Caixa</title><style>body{font-family:sans-serif;}.print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; } .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; } .print-table th { background-color: #f2f2f2; } h3 { font-size: 1.2em; margin-bottom: 10px; }</style></head><body>${printContent.innerHTML}</body></html>`);
            WinPrint?.document.close();
            WinPrint?.focus();
            WinPrint?.print();
            WinPrint?.close();
        }
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Fluxo de Caixa Detalhado" size='2xl' footer={
             <div className="flex justify-between items-center w-full">
                 <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Total do Período: </span>
                    <span className={`font-bold ${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(netTotal)}</span>
                 </div>
                <Button onClick={handlePrint}>Imprimir Relatório</Button>
            </div>
        }>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-6">
                <label htmlFor="accountFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por conta</label>
                <select id="accountFilter" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className={inputStyle}>
                    <option value="all">Todas as Contas</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
             <div className="printable-report space-y-4" ref={reportRef}>
                {groupedItems.map(([date, group]) => (
                     <div key={date} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 mb-2 border-b border-gray-200 dark:border-gray-600">
                             <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm sm:text-base">{date}</h4>
                             <div className='text-xs text-right space-x-2 sm:space-x-4 mt-1 sm:mt-0'>
                                <span className='text-green-600'>Créditos: {formatCurrency(group.dailyCredit)}</span>
                                <span className='text-red-600'>Débitos: {formatCurrency(group.dailyDebit)}</span>
                                <span className={`font-semibold ${group.netChange >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-red-500'}`}>
                                    Líquido Dia: {formatCurrency(group.netChange)}
                                </span>
                            </div>
                        </div>
                        <div className='space-y-2'>
                        {group.transactions.map((item, index) => (
                             <div key={index} className="flex justify-between items-center text-sm pl-2">
                                 <span className='truncate pr-2'>{item.description}</span>
                                 <span className={`flex-shrink-0 ${item.credit > item.debit ? 'text-green-500' : 'text-red-500'}`}>
                                     {formatCurrency(item.credit > item.debit ? item.credit : -item.debit)}
                                 </span>
                             </div>
                        ))}
                        </div>
                    </div>
                ))}
                {groupedItems.length === 0 && <p className="text-center py-4 text-gray-500">Nenhuma movimentação encontrada.</p>}
            </div>
        </Modal>
    );
}

const ProfitabilityReportModal: React.FC<{isOpen: boolean, onClose: () => void, loans: Loan[], clients: Client[]}> = ({isOpen, onClose, loans, clients}) => {
    const [filters, setFilters] = useState({ clientId: 'all', startDate: '', endDate: '' });
    
    const summary = useMemo(() => {
        const filteredLoans = loans.filter(l => {
            if (l.is_archived) return false;
            const clientMatch = filters.clientId === 'all' || l.clientId === filters.clientId;
            const dateMatch = (!filters.startDate || new Date(l.date) >= new Date(filters.startDate + 'T00:00:00')) &&
                              (!filters.endDate || new Date(l.date) <= new Date(filters.endDate + 'T23:59:59'));
            return clientMatch && dateMatch;
        });

        const paidLoans = filteredLoans.filter(l => l.status === 'paid');
        const totalCapitalLent = filteredLoans.reduce((sum, l) => sum + l.amount_borrowed, 0);
        const totalCapitalReturned = paidLoans.reduce((sum, l) => sum + l.amount_to_receive, 0);
        const netProfit = totalCapitalReturned - paidLoans.reduce((sum, l) => sum + l.amount_borrowed, 0);
        const profitability = totalCapitalLent > 0 ? (netProfit / totalCapitalLent) * 100 : 0;
        return { totalCapitalLent, totalCapitalReturned, netProfit, profitability, totalLoans: filteredLoans.length, paidLoansCount: paidLoans.length };
    }, [loans, filters]);

    const SummaryCard: React.FC<{title: string; value: string; description: string}> = ({title, value, description}) => (
        <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <h4 className='text-sm text-gray-500 dark:text-gray-400'>{title}</h4>
            <p className='text-2xl font-bold text-gray-800 dark:text-gray-100'>{value}</p>
            <p className='text-xs text-gray-500 dark:text-gray-400'>{description}</p>
        </div>
    )

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Relatório de Rentabilidade" size="2xl">
            <ReportFilters clients={clients} onFilterChange={setFilters} />
            <div className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <SummaryCard title="Total Emprestado" value={formatCurrency(summary.totalCapitalLent)} description={`Baseado em ${summary.totalLoans} empréstimos totais`} />
                    <SummaryCard title="Total Recebido (Quitados)" value={formatCurrency(summary.totalCapitalReturned)} description={`De ${summary.paidLoansCount} empréstimos quitados`} />
                </div>
                 <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <SummaryCard title="Lucro Líquido (Quitados)" value={formatCurrency(summary.netProfit)} description="Diferença entre recebido e emprestado" />
                    <SummaryCard title="Rentabilidade Média" value={`${summary.profitability.toFixed(2)}%`} description="Lucro / Total Emprestado" />
                </div>
            </div>
        </Modal>
    )
}

const LoansByClientReportModal: React.FC<{isOpen: boolean, onClose: () => void, loans: Loan[], clients: Client[]}> = ({isOpen, onClose, loans, clients}) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [filters, setFilters] = useState({ clientId: 'all', startDate: '', endDate: '' });

    const clientLoanSummary = useMemo(() => {
        const filteredLoans = loans.filter(l => {
            if (l.is_archived) return false;
            const dateMatch = (!filters.startDate || new Date(l.date) >= new Date(filters.startDate + 'T00:00:00')) &&
                              (!filters.endDate || new Date(l.date) <= new Date(filters.endDate + 'T23:59:59'));
            return dateMatch;
        });

        let clientsToReportOn = clients;
        if (filters.clientId !== 'all') {
            clientsToReportOn = clients.filter(c => c.id === filters.clientId);
        }

        const summary = clientsToReportOn.map(client => {
            const clientLoans = filteredLoans.filter(l => l.clientId === client.id);
            if (clientLoans.length === 0) return null;

            const totalBorrowed = clientLoans.reduce((sum, l) => sum + l.amount_borrowed, 0);
            const totalPaid = clientLoans.filter(l => l.status === 'paid').reduce((sum, l) => sum + l.amount_to_receive, 0);
            const totalOutstanding = clientLoans.reduce((sum, l) => sum + calculateCurrentOutstandingBalance(l), 0);

            return {
                clientId: client.id,
                clientName: client.name,
                totalBorrowed,
                totalPaid,
                totalOutstanding,
                loanCount: clientLoans.length
            };
        });
        return summary.filter(Boolean).sort((a,b) => (b?.totalOutstanding || 0) - (a?.totalOutstanding || 0)) as NonNullable<typeof summary[0]>[];
    }, [loans, clients, filters]);

     const handlePrint = () => {
        const printContent = reportRef.current;
        if (printContent) {
            const WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
            WinPrint?.document.write(`<html><head><title>Relatório de Empréstimos por Cliente</title><style>body{font-family:sans-serif;}.print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; } .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; } .print-table th { background-color: #f2f2f2; } h3 { font-size: 1.2em; margin-bottom: 10px; }</style></head><body>${printContent.innerHTML}</body></html>`);
            WinPrint?.document.close();
            WinPrint?.focus();
            WinPrint?.print();
            WinPrint?.close();
        }
    }
    
    const thStyle = "px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Relatório de Empréstimos por Cliente" size='2xl' footer={
            <div className="flex justify-end">
                <Button onClick={handlePrint}>Imprimir Relatório</Button>
            </div>
        }>
            <ReportFilters clients={clients} onFilterChange={setFilters} />
             <div className="printable-report" ref={reportRef}>
                {/* Mobile View */}
                <div className="sm:hidden space-y-4">
                    {clientLoanSummary.map(summary => (
                        <div key={summary.clientId} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100">{summary.clientName}</h4>
                            <div className="mt-2 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Total Emprestado:</span>
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{formatCurrency(summary.totalBorrowed)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Total Devolvido:</span>
                                    <span className="font-medium text-green-600">{formatCurrency(summary.totalPaid)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Total Pendente:</span>
                                    <span className="font-bold text-yellow-600">{formatCurrency(summary.totalOutstanding)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Desktop View */}
                <div className='overflow-x-auto hidden sm:block'>
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className={thStyle}>Cliente</th>
                                <th className={`${thStyle} text-right`}>Total Emprestado</th>
                                <th className={`${thStyle} text-right`}>Total Devolvido</th>
                                <th className={`${thStyle} text-right`}>Total Pendente</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {clientLoanSummary.map(summary => (
                                <tr key={summary.clientId}>
                                    <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-sm font-medium">{summary.clientName}</td>
                                    <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-sm text-right">{formatCurrency(summary.totalBorrowed)}</td>
                                    <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-sm text-right text-green-500">{formatCurrency(summary.totalPaid)}</td>
                                    <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-yellow-500">{formatCurrency(summary.totalOutstanding)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {clientLoanSummary.length === 0 && <p className="text-center py-4 text-gray-500">Nenhum empréstimo encontrado para os filtros selecionados.</p>}
            </div>
        </Modal>
    );
}

// --- New Installment Report ---
type EnhancedInstallment = InstallmentDetail & { loanId: string; clientName: string; clientId: string; daysOverdue?: number };

const InstallmentReportModal: React.FC<{isOpen: boolean, onClose: () => void, loans: Loan[], clients: Client[]}> = ({isOpen, onClose, loans, clients}) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [filters, setFilters] = useState({ clientId: 'all', startDate: '', endDate: '' });
    const [viewType, setViewType] = useState<'upcoming' | 'period'>('upcoming');

    const { overdue, upcoming, paid, totals } = useMemo(() => {
        const today = getTodayInBrasilia();

        const flattened: EnhancedInstallment[] = loans
            .filter(l => l.modality === 'Parcelado (Principal + Juros em X vezes)' && l.installments_details && !l.is_archived)
            .flatMap(l => l.installments_details!.map(i => ({
                ...i,
                loanId: l.id,
                clientName: l.clientName || 'Desconhecido',
                clientId: l.clientId,
            })));
        
        const filtered = flattened.filter(i => {
             const clientMatch = filters.clientId === 'all' || i.clientId === filters.clientId;
             const dueDate = new Date(i.due_date.split('T')[0] + 'T00:00:00');
             const dateMatch = (!filters.startDate || dueDate >= new Date(filters.startDate + 'T00:00:00')) &&
                              (!filters.endDate || dueDate <= new Date(filters.endDate + 'T23:59:59'));
             return clientMatch && dateMatch;
        });

        const overdue = filtered
            .filter(i => i.status === 'pending' && new Date(i.due_date.split('T')[0] + 'T00:00:00') < today)
            .map(i => ({...i, daysOverdue: Math.max(0, Math.floor((today.getTime() - new Date(i.due_date.split('T')[0] + 'T00:00:00').getTime()) / (1000 * 3600 * 24))) }))
            .sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
            
        const upcoming = filtered
            .filter(i => {
                const dueDate = new Date(i.due_date.split('T')[0] + 'T00:00:00');
                if (i.status !== 'pending' || dueDate < today) return false;
                
                if (viewType === 'upcoming') {
                    const thirtyDaysFromNow = new Date(today);
                    thirtyDaysFromNow.setDate(today.getDate() + 30);
                    return dueDate <= thirtyDaysFromNow;
                }
                return true; // for 'period' view, it's already filtered by the main date range
            })
            .sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
            
        const paid = filtered
            .filter(i => i.status === 'paid')
            .sort((a,b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime());

        const totals = {
            overdue: overdue.reduce((sum, i) => sum + i.amount, 0),
            upcoming: upcoming.reduce((sum, i) => sum + i.amount, 0),
            paid: paid.reduce((sum, i) => sum + (i.amount_paid || i.amount), 0),
        };

        return { overdue, upcoming, paid, totals };
    }, [loans, filters, viewType]);

    const handlePrint = () => {
        const printContent = reportRef.current;
        if (printContent) {
            const WinPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
            WinPrint?.document.write(`<html><head><title>Relatório de Parcelas</title><style>body{font-family:sans-serif;}.print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; } .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; } .print-table th { background-color: #f2f2f2; } h3 { font-size: 1.2em; margin-bottom: 10px; }</style></head><body>${printContent.innerHTML}</body></html>`);
            WinPrint?.document.close();
            WinPrint?.focus();
            WinPrint?.print();
            WinPrint?.close();
        }
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Controle de Parcelas" size='2xl' footer={
            <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
                <div className="text-xs text-center sm:text-left">
                    <span className="mr-4"><strong>Atrasado:</strong> <span className='text-red-500'>{formatCurrency(totals.overdue)}</span></span>
                    <span className="mr-4"><strong>Pendente:</strong> <span className='text-yellow-600'>{formatCurrency(totals.upcoming)}</span></span>
                    <span><strong>Pago:</strong> <span className='text-green-600'>{formatCurrency(totals.paid)}</span></span>
                </div>
                <Button onClick={handlePrint}>Imprimir Relatório</Button>
            </div>
        }>
            <div className="flex flex-col md:flex-row gap-4 md:items-end">
                <div className='flex-grow'>
                    <ReportFilters clients={clients} onFilterChange={setFilters} />
                </div>
                <div className='flex-shrink-0'>
                    <label htmlFor="viewTypeFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Visualizar Pendentes</label>
                    <select id="viewTypeFilter" value={viewType} onChange={e => setViewType(e.target.value as 'upcoming' | 'period')} className={inputStyle}>
                        <option value="upcoming">Próximos 30 dias</option>
                        <option value="period">Todas no Período</option>
                    </select>
                </div>
            </div>
             <div className="printable-report space-y-6 mt-6" ref={reportRef}>
                <InstallmentSection title="Parcelas Atrasadas" installments={overdue} type="overdue" />
                <InstallmentSection title={viewType === 'upcoming' ? "Próximas a Vencer (30 dias)" : "Parcelas Pendentes no Período"} installments={upcoming} type="upcoming" />
                <InstallmentSection title="Parcelas Pagas" installments={paid} type="paid" />
            </div>
        </Modal>
    );
}

const InstallmentSection: React.FC<{title: string, installments: EnhancedInstallment[], type: 'overdue' | 'upcoming' | 'paid'}> = ({ title, installments, type }) => {
    const thStyle = "px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300";
    if(installments.length === 0) return null;

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">{title} ({installments.length})</h3>
             {/* Mobile View */}
            <div className="sm:hidden space-y-3">
                {installments.map(i => (
                    <div key={`${i.loanId}-${i.installment_number}`} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow">
                        <div className="flex justify-between">
                            <p className='font-bold text-sm'>{i.clientName}</p>
                            <p className='font-bold text-sm'>{formatCurrency(i.amount)}</p>
                        </div>
                         <p className='text-xs text-gray-500'>Parcela {i.installment_number} / Venc: {formatDateForBrasilia(i.due_date)}</p>
                         {type === 'overdue' && <p className='text-xs text-red-500 font-semibold'>{i.daysOverdue} dias de atraso</p>}
                         {type === 'paid' && i.payment_date && (
                             <div className='text-xs text-green-600 mt-1 flex items-center gap-1'>
                                <CheckCircleIcon className="w-3 h-3" />
                                Pago em {formatDateForBrasilia(i.payment_date)}
                            </div>
                         )}
                    </div>
                ))}
            </div>
            {/* Desktop View */}
            <div className="overflow-x-auto hidden sm:block">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className={thStyle}>Cliente</th>
                            <th className={thStyle}>Parcela</th>
                            {type === 'paid' ? <th className={thStyle}>Data Pag.</th> : <th className={thStyle}>Vencimento</th>}
                            {type === 'overdue' && <th className={`${thStyle} text-center`}>Dias Atraso</th>}
                            <th className={`${thStyle} text-right`}>Valor</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {installments.map(i => (
                             <tr key={`${i.loanId}-${i.installment_number}`}>
                                <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap font-medium">{i.clientName}</td>
                                <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap text-center">{i.installment_number}</td>
                                <td className={`px-2 sm:px-6 py-3 text-sm whitespace-nowrap ${type === 'overdue' ? 'text-red-500 font-semibold' : ''}`}>
                                    {type === 'paid' ? formatDateForBrasilia(i.payment_date!) : formatDateForBrasilia(i.due_date)}
                                </td>
                                {type === 'overdue' && <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap text-center text-red-500 font-semibold">{i.daysOverdue}</td>}
                                <td className="px-2 sm:px-6 py-3 text-sm whitespace-nowrap text-right font-bold">{formatCurrency(i.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const ModalitySummaryReportModal: React.FC<{isOpen: boolean, onClose: () => void, loans: Loan[], clients: Client[]}> = ({isOpen, onClose, loans, clients}) => {
    const [filters, setFilters] = useState({ clientId: 'all', startDate: '', endDate: '' });

    const summary = useMemo(() => {
        const filteredLoans = loans.filter(l => {
            if (l.is_archived || l.status === 'paid') return false;
            const clientMatch = filters.clientId === 'all' || l.clientId === filters.clientId;
            const dateMatch = (!filters.startDate || new Date(l.date) >= new Date(filters.startDate + 'T00:00:00')) &&
                              (!filters.endDate || new Date(l.date) <= new Date(filters.endDate + 'T23:59:59'));
            return clientMatch && dateMatch;
        });

        const pagUnico = filteredLoans.filter(l => l.modality === 'Pagamento Único (Principal + Juros)');
        const jurosMensal = filteredLoans.filter(l => l.modality === 'Juros Mensal (+ Principal no final)');
        const parcelado = filteredLoans.filter(l => l.modality === 'Parcelado (Principal + Juros em X vezes)');
        const today = getTodayInBrasilia();

        const calculateStats = (loanList: Loan[]) => ({
            count: loanList.length,
            totalOutstanding: loanList.reduce((sum, l) => sum + calculateCurrentOutstandingBalance(l), 0),
            overdueCount: loanList.filter(l => new Date(l.due_date.split('T')[0] + 'T00:00:00') < today).length,
            overdueAmount: loanList.filter(l => new Date(l.due_date.split('T')[0] + 'T00:00:00') < today)
                .reduce((sum, l) => sum + calculateCurrentOutstandingBalance(l), 0),
            totalReceived: loanList.reduce((sum, loan) => {
                if (loan.modality === 'Juros Mensal (+ Principal no final)' && loan.interest_payments_history) {
                    return sum + loan.interest_payments_history.reduce((interestSum, p) => interestSum + p.amount_paid, 0);
                }
                return sum;
            }, 0),
        });
        
        const calculateParceladoStats = (loanList: Loan[]) => {
            let overdueInstallments = 0;
            const overdueLoans = new Set<string>();

            loanList.forEach(l => {
                l.installments_details?.forEach(i => {
                    if (i.status === 'pending' && new Date(i.due_date.split('T')[0] + 'T00:00:00') < today) {
                        overdueInstallments++;
                        overdueLoans.add(l.id);
                    }
                })
            });
            
            const totalReceived = loanList.reduce((sum, loan) => {
                if (loan.installments_details) {
                    return sum + loan.installments_details
                        .filter(i => i.status === 'paid')
                        .reduce((installmentSum, i) => installmentSum + (i.amount_paid || i.amount), 0);
                }
                return sum;
            }, 0);

            return {
                count: loanList.length,
                totalOutstanding: loanList.reduce((sum, l) => sum + calculateCurrentOutstandingBalance(l), 0),
                overdueCount: overdueLoans.size,
                overdueAmount: loanList.filter(l => overdueLoans.has(l.id))
                    .reduce((sum, l) => sum + calculateCurrentOutstandingBalance(l), 0),
                totalReceived: totalReceived,
            }
        };

        return {
            pagUnico: calculateStats(pagUnico),
            jurosMensal: calculateStats(jurosMensal),
            parcelado: calculateParceladoStats(parcelado),
        };

    }, [loans, filters]);
    
    const SummarySection: React.FC<{title: string, stats: any}> = ({title, stats}) => (
        <Card>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{title}</h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Empréstimos Abertos:</span> <span className='font-semibold'>{stats.count}</span></div>
                <div className="flex justify-between text-green-600 dark:text-green-400"><span>Recebido (Juros/Parcelas):</span> <span className='font-semibold'>{formatCurrency(stats.totalReceived)}</span></div>
                <div className="flex justify-between"><span>Total Pendente:</span> <span className='font-semibold'>{formatCurrency(stats.totalOutstanding)}</span></div>
                <div className="flex justify-between text-red-600 dark:text-red-400"><span>Empréstimos Atrasados:</span> <span className='font-semibold'>{stats.overdueCount}</span></div>
                <div className="flex justify-between text-red-600 dark:text-red-400"><span>Valor Atrasado:</span> <span className='font-semibold'>{formatCurrency(stats.overdueAmount)}</span></div>
            </div>
        </Card>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Resumo por Modalidade" size="2xl">
            <ReportFilters clients={clients} onFilterChange={setFilters} />
            <div className="space-y-4">
                <SummarySection title="Pagamento Único" stats={summary.pagUnico} />
                <SummarySection title="Juros Mensal" stats={summary.jurosMensal} />
                <SummarySection title="Parcelado" stats={summary.parcelado} />
            </div>
        </Modal>
    );
};


const DeletionHistoryModal: React.FC<{isOpen: boolean, onClose: () => void, history: DeletionRecord[]}> = ({isOpen, onClose, history}) => {
    const [filter, setFilter] = useState<'all' | 'loan' | 'client' | 'account'>('all');

    const filteredHistory = useMemo(() => {
        return history
            .filter(record => filter === 'all' || record.type === filter)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [history, filter]);
    
    const typeConfig = {
        loan: { text: 'Empréstimo', icon: <BanknoteIcon />, color: 'text-blue-500'},
        client: { text: 'Cliente', icon: <UserCircleIcon />, color: 'text-purple-500' },
        account: { text: 'Conta', icon: <TrashIcon />, color: 'text-green-500' }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Histórico de Exclusões" size="2xl">
            <div className="flex justify-center space-x-2 mb-6">
                {(['all', 'loan', 'client', 'account'] as const).map(f => (
                    <Button key={f} variant={filter === f ? 'primary' : 'secondary'} onClick={() => setFilter(f)} className="capitalize !text-sm !px-3 !py-1">
                        {f === 'all' ? 'Todos' : typeConfig[f].text + 's'}
                    </Button>
                ))}
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {filteredHistory.length > 0 ? filteredHistory.map((record, index) => (
                    <div key={index} className="flex items-start space-x-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${typeConfig[record.type].color}`}>
                            {React.cloneElement(typeConfig[record.type].icon, { className: 'w-5 h-5' })}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                <span className='font-bold'>{typeConfig[record.type].text}</span>
                                {` "${record.name}" foi ${record.action === 'archived' ? 'arquivado' : 'excluído'}.`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(record.date).toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                )) : (
                    <p className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum registro de exclusão encontrado.</p>
                )}
            </div>
        </Modal>
    );
};