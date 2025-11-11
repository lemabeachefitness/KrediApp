import React, { useState, useMemo, useEffect } from 'react';
import { Button, Modal, useToasts, CurrencyInput, formatDateForBrasilia, getTodayInBrasilia, calculateDaysOverdue } from './Shared';
import type { Loan, Client, LoanStatus, LoanModality, InstallmentDetail, Account, Transaction, DeletionRecord } from '../types';
import { PencilIcon, TrashIcon, WhatsAppIcon, HistoryIcon, DollarSignIcon, CheckCircleIcon, CalendarPlusIcon, InfoIcon, RestoreIcon } from './Icons';

interface LoansPageProps {
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  clients: Client[];
  accounts: Account[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setDeletionHistory: React.Dispatch<React.SetStateAction<DeletionRecord[]>>;
}

const inputStyle = "w-full px-3 py-2 mt-1 text-gray-800 bg-white border border-gray-300 rounded-md dark:bg-gray-900 dark:text-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm";
const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";

const statusConfig: Record<LoanStatus, { text: string; classes: string, dot: string }> = {
    pending: { text: 'Pendente', classes: 'text-yellow-700 dark:text-yellow-200', dot: 'bg-yellow-400' },
    paid: { text: 'Pago', classes: 'text-green-700 dark:text-green-200', dot: 'bg-green-400' },
    overdue: { text: 'Atrasado', classes: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
};

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const calculateInstallmentDueInfo = (installment: InstallmentDetail, loan: Loan) => {
    if (installment.status === 'paid') {
        return { totalDue: 0, lateFee: 0, daysOverdue: 0 };
    }

    const today = getTodayInBrasilia();
    const dueDate = new Date(installment.due_date.split('T')[0] + 'T00:00:00');
    let lateFee = 0;
    let daysOverdue = 0;

    if (dueDate < today) {
        daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        lateFee = daysOverdue * (loan.daily_late_fee_amount || 0);
    }

    return {
        totalDue: installment.amount + lateFee,
        lateFee,
        daysOverdue
    };
};

const getDynamicStatus = (loan: Loan): { effectiveStatus: LoanStatus, isOverdue: boolean, isUrgent: boolean } => {
    if (loan.status === 'paid') {
        return { effectiveStatus: 'paid', isOverdue: false, isUrgent: false };
    }

    const today = getTodayInBrasilia();
    
    // For installment loans, check each pending installment
    if (loan.modality === 'Parcelado (Principal + Juros em X vezes)' && loan.installments_details) {
        const isAnyOverdue = loan.installments_details.some(i => i.status === 'pending' && new Date(i.due_date.split('T')[0] + 'T00:00:00') < today);
        if (isAnyOverdue) {
            return { effectiveStatus: 'overdue', isOverdue: true, isUrgent: false };
        }
    }

    // Default check for single payment loans or overall loan due date
    const dueDate = new Date(loan.due_date.split('T')[0] + 'T00:00:00');
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    const isOverdue = diffDays < 0;
    const isUrgent = !isOverdue && diffDays <= 3;
    
    return { effectiveStatus: isOverdue ? 'overdue' : 'pending', isOverdue, isUrgent: false };
}


const LoanCard: React.FC<{ loan: Loan, client: Client | undefined, onEdit: (loan: Loan) => void, onArchive: (id: string) => void, onRestore: (id: string) => void, onPermanentDelete: (id: string) => void, onReceive: (loan: Loan, totalToReceive: number) => void, onAddPromise: (loan: Loan) => void, onShowInterestDetails: (loan: Loan) => void }> = ({ loan, client, onEdit, onArchive, onRestore, onPermanentDelete, onReceive, onAddPromise, onShowInterestDetails }) => {
    const { clientName, id, date, due_date, amount_borrowed, amount_to_receive, interest_rate, daily_late_fee_amount, promise_history, due_date_history, is_in_negotiation, modality, installments, installments_details, observation, is_archived } = loan;
    const [isHistoryOpen, setHistoryOpen] = useState(false);
    
    const { effectiveStatus, isOverdue, isUrgent } = getDynamicStatus(loan);

    const getBorderColor = () => {
        if (is_archived) return 'border-gray-500';
        if (effectiveStatus === 'paid') return 'border-green-500';
        if (isOverdue) return 'border-red-500';
        if (isUrgent) return 'border-yellow-400';
        return 'border-primary-500'; // Default for pending loans
    };
    const cardBorderColor = getBorderColor();

    const daysOverdue = calculateDaysOverdue(due_date);
    const lateFee = daysOverdue * daily_late_fee_amount;
    const totalToReceiveWithFee = amount_to_receive + lateFee;

    const handleWhatsAppClick = () => {
        if(!client) return;
        const dueDateFormatted = formatDateForBrasilia(due_date);
        const message = `📌 LEMBRETE DE VENCIMENTO 💰\n\nBOA TARDE, ${client.name}.\n\nSeu empréstimo vence em ${dueDateFormatted}! ⏰\n\n✅ LEMBRETE: AGUARDO A REGULARIZAÇÃO DO PAGAMENTO.\n\nATENÇÃO: Pagamentos posteriores ao vencimento serão atualizados incluindo juros por atraso.\n\nJUROS DIÁRIO: ${formatCurrency(daily_late_fee_amount)}/DIA.`;
        const whatsappUrl = `https://wa.me/55${client.phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }
    
    const nextInstallment = installments_details?.find(i => i.status === 'pending');
    const nextInstallmentInfo = nextInstallment ? calculateInstallmentDueInfo(nextInstallment, loan) : null;
    
    // Determine the amount and late fee to display on the card footer
    let totalToReceiveForCard: number;
    let lateFeeForCard: number = 0;
    
    if (nextInstallmentInfo) {
        totalToReceiveForCard = nextInstallmentInfo.totalDue;
        lateFeeForCard = nextInstallmentInfo.lateFee;
    } else {
        totalToReceiveForCard = totalToReceiveWithFee;
        if (isOverdue) {
            lateFeeForCard = lateFee;
        }
    }

    const paidInstallments = installments_details?.filter(i => i.status === 'paid').length || 0;
    
    const hasHistory = (promise_history && promise_history.length > 0) || (due_date_history && due_date_history.length > 0) || (installments_details && paidInstallments > 0) || (observation && observation.length > 0) || (loan.interest_payments_history && loan.interest_payments_history.length > 0);

    const interestValue = modality === 'Juros Mensal (+ Principal no final)'
      ? amount_to_receive
      : amount_to_receive - amount_borrowed;

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 ${cardBorderColor}`}>
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                     <div className='flex items-center gap-2 flex-wrap'>
                        {is_archived && <span className='text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full font-semibold'>ARQUIVADO</span>}
                        {isOverdue && is_in_negotiation && <span className='text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold'>Negociação</span>}
                        {(promise_history && promise_history.length > 0) && <span className='text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-semibold'>Promessa</span>}
                    </div>
                     <div className="flex items-center space-x-2">
                        {is_archived ? (
                            <>
                                <button onClick={() => onRestore(id)} className="text-gray-400 hover:text-green-500" title="Restaurar"><RestoreIcon /></button>
                                <button onClick={() => onPermanentDelete(id)} className="text-gray-400 hover:text-red-500" title="Excluir Permanentemente"><TrashIcon /></button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => onShowInterestDetails(loan)} className="text-gray-400 hover:text-indigo-500" title="Detalhes dos Juros"><InfoIcon /></button>
                                {hasHistory && (
                                    <button onClick={() => setHistoryOpen(true)} className="text-gray-400 hover:text-purple-500"><HistoryIcon /></button>
                                )}
                                <button onClick={handleWhatsAppClick} disabled={!client} className="text-gray-400 hover:text-green-500 disabled:opacity-50"><WhatsAppIcon /></button>
                                {effectiveStatus !== 'paid' && <button onClick={() => onAddPromise(loan)} className="text-gray-400 hover:text-yellow-500"><CalendarPlusIcon /></button>}
                                <button onClick={() => onEdit(loan)} className="text-gray-400 hover:text-blue-500"><PencilIcon /></button>
                                <button onClick={() => onArchive(id)} className="text-gray-400 hover:text-red-500"><TrashIcon /></button>
                            </>
                        )}
                    </div>
                </div>
                 <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{clientName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Empréstimo #{id.slice(-6)}</p>
                </div>

                <div className="mt-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                    <div className="grid grid-cols-3 gap-2">
                        <div className='text-center'>
                           <p className="text-xs text-gray-500 dark:text-gray-400">STATUS</p>
                           <p className={`font-bold text-sm ${statusConfig[effectiveStatus].classes}`}>{statusConfig[effectiveStatus].text}</p>
                        </div>
                        <div className='text-center'>
                            <p className="text-xs text-gray-500 dark:text-gray-400">PRINCIPAL</p>
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{formatCurrency(amount_borrowed)}</p>
                        </div>
                         <div className='text-center'>
                            <p className="text-xs text-gray-500 dark:text-gray-400">JUROS (R$)</p>
                             <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{formatCurrency(interestValue)}</p>
                             <p className="text-xs text-gray-500 dark:text-gray-400">({interest_rate.toFixed(1)}%)</p>
                        </div>
                         <div className='text-center'>
                            <p className="text-xs text-gray-500 dark:text-gray-400">DATA</p>
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{formatDateForBrasilia(date)}</p>
                        </div>
                         <div className='text-center'>
                            <p className="text-xs text-gray-500 dark:text-gray-400">VENCIMENTO</p>
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{formatDateForBrasilia(due_date)}</p>
                        </div>
                         <div className='text-center'>
                            <p className="text-xs text-gray-500 dark:text-gray-400">MODALIDADE</p>
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                                {modality === 'Parcelado (Principal + Juros em X vezes)' ? `${paidInstallments}/${installments} Parcelas` : modality.split(' ')[0]}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
             {effectiveStatus !== 'paid' && !is_archived && (
                <div className={`p-4 rounded-b-lg flex justify-between items-center ${isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/20'}`}>
                    <div className='flex items-center gap-4'>
                        <Button variant='secondary' onClick={() => onReceive(loan, totalToReceiveForCard)} className="!p-2">
                            <DollarSignIcon />
                        </Button>
                        <div>
                            <p className={`text-xs ${isOverdue ? 'text-red-700 dark:text-red-200' : 'text-green-700 dark:text-green-200'}`}>{nextInstallment ? `PRÓXIMA PARCELA` : 'A RECEBER'}</p>
                            <p className={`font-bold text-xl ${isOverdue ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}`}>{formatCurrency(totalToReceiveForCard)}</p>
                            {isOverdue && lateFeeForCard > 0 && <p className="text-xs text-red-500 dark:text-red-400">({formatCurrency(lateFeeForCard)} mora)</p>}
                        </div>
                    </div>
                    {isOverdue && <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse-red"></div>}
                </div>
             )}
              {effectiveStatus === 'paid' && !is_archived && (
                 <div className="p-4 rounded-b-lg bg-green-100 dark:bg-green-900/30 text-center">
                    <p className='font-bold text-green-700 dark:text-green-200'>Empréstimo Quitado!</p>
                 </div>
              )}
             <LoanHistoryModal isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)} loan={loan} />
        </div>
    );
};

export const LoansPage: React.FC<LoansPageProps> = ({ loans, setLoans, clients, accounts, setTransactions, setDeletionHistory }) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'paid' | 'archived' | LoanStatus
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [receivingLoanInfo, setReceivingLoanInfo] = useState<{loan: Loan, totalToReceive: number} | null>(null);
  const [promiseLoan, setPromiseLoan] = useState<Loan | null>(null);
  const [interestDetailLoan, setInterestDetailLoan] = useState<Loan | null>(null);

  const addToast = useToasts();

  const loansWithStatus = useMemo(() => loans.map(loan => {
      const isFullyPaid = loan.modality === 'Parcelado (Principal + Juros em X vezes)' ? loan.installments_details?.every(i => i.status === 'paid') : loan.status === 'paid';
      const dynamic = getDynamicStatus(loan);
      return {...loan, effectiveStatus: isFullyPaid ? 'paid' : dynamic.effectiveStatus};
  }), [loans]);


  const filteredLoans = useMemo(() => {
    return loansWithStatus.filter(loan => {
      const isFullyPaid = loan.modality === 'Parcelado (Principal + Juros em X vezes)' ? loan.installments_details?.every(i => i.status === 'paid') : loan.status === 'paid';
      
      // Handle the new "Archived" view
      if (statusFilter === 'archived') {
        if (!loan.is_archived) return false;
      } else {
        if (loan.is_archived) return false; // Hide archived loans from all other views
      }
      
      let matchesView;
      switch(statusFilter) {
          case 'open':
            matchesView = !isFullyPaid;
            break;
          case 'paid':
            matchesView = isFullyPaid;
            break;
          case 'archived':
            matchesView = true; // Already filtered by is_archived flag
            break;
          default: // 'pending' or 'overdue'
            matchesView = loan.effectiveStatus === statusFilter && !isFullyPaid;
      }
      
      const matchesFilter = filter === '' || loan.clientName?.toLowerCase().includes(filter.toLowerCase()) || loan.id.toLowerCase().includes(filter.toLowerCase());
      
      return matchesView && matchesFilter;
    }).sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [loansWithStatus, statusFilter, filter]);
  
  const handleSaveLoan = (loan: Loan) => {
    const selectedClient = clients.find(c => c.id === loan.clientId);
    let loanWithClientName = {...loan, clientName: selectedClient?.name ?? 'Cliente não encontrado'};

    if (editingLoan) {
      if(editingLoan.due_date.split('T')[0] !== loan.due_date.split('T')[0]) {
        const newHistoryEntry = {
          old_due_date: editingLoan.due_date,
          new_due_date: loan.due_date,
          change_date: new Date().toISOString()
        };
        loanWithClientName.due_date_history = [...(editingLoan.due_date_history || []), newHistoryEntry];
      }
      
      setLoans(prev => prev.map(l => l.id === loan.id ? loanWithClientName : l));
      addToast('Empréstimo atualizado com sucesso!', 'success');
    } else {
      const newLoan = {...loanWithClientName, id: `loan-${Date.now()}`};
      setLoans(prev => [newLoan, ...prev]);
      // Create debit transaction for new loan
      const newTransaction: Transaction = {
          id: `txn-${Date.now()}`,
          accountId: newLoan.account_id,
          description: `Empréstimo: ${newLoan.clientName}`,
          amount: newLoan.amount_borrowed,
          type: 'debit',
          date: newLoan.date,
      };
      setTransactions(prev => [newTransaction, ...prev]);
      addToast('Empréstimo cadastrado com sucesso!', 'success');
    }
    setModalOpen(false);
    setEditingLoan(null);
  };
  
  const handleArchiveLoan = (id: string) => {
    if(window.confirm('Tem certeza que deseja arquivar este empréstimo? Ele poderá ser restaurado ou excluído permanentemente mais tarde.')) {
        const loanToArchive = loans.find(l => l.id === id);
        if (loanToArchive) {
            setLoans(prev => prev.map(l => l.id === id ? { ...l, is_archived: true } : l));
            setDeletionHistory(prev => [...prev, {
                type: 'loan',
                action: 'archived',
                name: loanToArchive.clientName || 'Cliente Desconhecido',
                date: new Date().toISOString()
            }]);
            addToast('Empréstimo arquivado.', 'info');
        }
    }
  }

  const handleRestoreLoan = (id: string) => {
    setLoans(prev => prev.map(l => l.id === id ? { ...l, is_archived: false } : l));
    addToast('Empréstimo restaurado para a lista de ativos.', 'success');
  }

  const handlePermanentDeleteLoan = (id: string) => {
    if(window.confirm('Atenção! Esta ação é irreversível e excluirá permanentemente este empréstimo e todo o seu histórico. Deseja continuar?')) {
        const loanToDelete = loans.find(l => l.id === id);
        if(loanToDelete) {
            setLoans(prev => prev.filter(l => l.id !== id));
            setDeletionHistory(prev => [...prev, {
                type: 'loan',
                action: 'deleted',
                name: loanToDelete.clientName || 'Cliente Desconhecido',
                date: new Date().toISOString()
            }]);
            addToast('Empréstimo excluído permanentemente.', 'success');
        }
    }
  }

  const handleReceivePayment = (loan: Loan, paymentDate: string, amountPaid: number, accountId: string, installmentNumber?: number, paymentType?: 'interest_only' | 'full') => {
     setLoans(prevLoans => prevLoans.map(l => {
         if (l.id === loan.id) {
             const updatedLoan = { ...l };
             
             if (l.modality === 'Juros Mensal (+ Principal no final)' && paymentType === 'interest_only') {
                const newPaymentRecord = { date: paymentDate, amount_paid: amountPaid };
                updatedLoan.interest_payments_history = [...(l.interest_payments_history || []), newPaymentRecord];

                const currentDueDate = new Date(l.due_date.split('T')[0] + 'T00:00:00');
                currentDueDate.setMonth(currentDueDate.getMonth() + 1);
                updatedLoan.due_date = currentDueDate.toISOString();

                // Recalculate status based on the new due date, but don't mark as paid
                const tempStatus = getDynamicStatus({ ...l, due_date: updatedLoan.due_date });
                updatedLoan.status = tempStatus.effectiveStatus;
             
             } else if (l.modality === 'Parcelado (Principal + Juros em X vezes)' && installmentNumber) {
                updatedLoan.installments_details = l.installments_details?.map(i => 
                    i.installment_number === installmentNumber ? { ...i, status: 'paid', payment_date: paymentDate, amount_paid: amountPaid } : i
                );
                const allPaid = updatedLoan.installments_details?.every(i => i.status === 'paid');
                if(allPaid) {
                    updatedLoan.status = 'paid';
                    updatedLoan.payment_date = paymentDate;
                }
             } else {
                 // This is a full payment (for Pagamento Único, or the 'full' option for Juros Mensal)
                 updatedLoan.status = 'paid';
                 updatedLoan.payment_date = paymentDate;
             }
             return updatedLoan;
         }
         return l;
     }));
     
     // Create credit transaction for payment
     const newTransaction: Transaction = {
          id: `txn-${Date.now()}`,
          accountId: accountId,
          description: `Recebimento: ${loan.clientName}${installmentNumber ? ` (Parc. ${installmentNumber})` : ''}${paymentType === 'interest_only' ? ' (Juros)' : ''}`,
          amount: amountPaid,
          type: 'credit',
          date: paymentDate,
     };
     setTransactions(prev => [newTransaction, ...prev]);

     addToast('Recebimento registrado!', 'success');
     setReceivingLoanInfo(null);
  };

  const handleAddPromise = (loan: Loan, promiseDate: string, promiseNote: string) => {
    const newPromise = {
        date: new Date().toISOString(),
        note: promiseNote,
        promised_due_date: promiseDate
    };
    setLoans(prev => prev.map(l => l.id === loan.id ? { ...l, promise_history: [...(l.promise_history || []), newPromise], due_date: promiseDate } : l));
    addToast('Promessa de pagamento adicionada!', 'success');
    setPromiseLoan(null);
  };

  const openModalForNew = () => { setEditingLoan(null); setModalOpen(true); };
  const openModalForEdit = (loan: Loan) => { setEditingLoan(loan); setModalOpen(true); };
  const openModalForReceive = (loan: Loan, totalToReceive: number) => { setReceivingLoanInfo({loan, totalToReceive}); };
  const openModalForPromise = (loan: Loan) => { setPromiseLoan(loan); };
  const openModalForInterestDetails = (loan: Loan) => { setInterestDetailLoan(loan); };
  
  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center flex-wrap gap-2 md:gap-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                {Object.values(statusConfig).filter(s => s.text !== 'Pago').map(s => (
                    <div key={s.text} className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${s.dot}`}></span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{s.text}</span>
                    </div>
                ))}
                 <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full bg-purple-400`}></span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Promessa</span>
                </div>
                 <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full bg-blue-400`}></span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Negociação</span>
                </div>
            </div>
        </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className='flex flex-col sm:flex-row gap-4 w-full sm:w-auto'>
            <input
              type="text"
              placeholder="Pesquisar por Cliente ou Nº"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full sm:w-60 px-3 py-2 text-gray-700 bg-gray-100 border border-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 text-gray-700 bg-gray-100 border border-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
                <option value="open">Em Aberto</option>
                <option value="paid">Pagos</option>
                <option value="pending">Pendente</option>
                <option value="overdue">Atrasado</option>
                <option value="archived">Arquivados</option>
            </select>
        </div>
        <Button onClick={openModalForNew} className="w-full sm:w-auto mt-2 sm:mt-0">Novo Empréstimo</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLoans.map(loan => (
          <LoanCard 
            key={loan.id} 
            loan={loan} 
            client={clients.find(c => c.id === loan.clientId)} 
            onEdit={openModalForEdit} 
            onArchive={handleArchiveLoan}
            onRestore={handleRestoreLoan}
            onPermanentDelete={handlePermanentDeleteLoan}
            onReceive={openModalForReceive} 
            onAddPromise={openModalForPromise}
            onShowInterestDetails={openModalForInterestDetails}
          />
        ))}
      </div>
      {filteredLoans.length === 0 && (
            <div className="text-center py-10 col-span-full">
                <p className="text-gray-500 dark:text-gray-400">Nenhum empréstimo encontrado para esta visualização.</p>
            </div>
        )}

      <LoanModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveLoan}
        loan={editingLoan}
        clients={clients}
        accounts={accounts}
      />
      
      {receivingLoanInfo && (
          <QuickReceiveModal
            isOpen={!!receivingLoanInfo}
            onClose={() => setReceivingLoanInfo(null)}
            onSave={handleReceivePayment}
            loanInfo={receivingLoanInfo}
            accounts={accounts}
          />
      )}
      
      {promiseLoan && (
          <AddPromiseModal
            isOpen={!!promiseLoan}
            onClose={() => setPromiseLoan(null)}
            onSave={handleAddPromise}
            loan={promiseLoan}
          />
      )}
      
      {interestDetailLoan && (
        <InterestDetailModal 
            isOpen={!!interestDetailLoan}
            onClose={() => setInterestDetailLoan(null)}
            loan={interestDetailLoan}
        />
      )}
    </div>
  );
};


interface LoanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (loan: Loan) => void;
    loan: Loan | null;
    clients: Client[];
    accounts: Account[];
}

const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose, onSave, loan, clients, accounts }) => {
    const [formData, setFormData] = useState<Partial<Loan>>({});
    
    // Effect to initialize form state when modal opens or loan data changes
    useEffect(() => {
        if (isOpen) {
            if (loan) {
                setFormData(loan);
            } else {
                setFormData({
                    status: 'pending',
                    interest_rate: 10,
                    daily_late_fee_amount: 1,
                    amount_borrowed: undefined,
                    amount_to_receive: undefined,
                    modality: 'Pagamento Único (Principal + Juros)',
                    date: new Date().toISOString().split('T')[0],
                    account_id: accounts.length > 0 ? accounts[0].id : ''
                });
            }
        }
    }, [loan, isOpen, accounts]);

    const handleFormChange = (updates: Partial<Loan>) => {
        setFormData(prev => {
            const newState = { ...prev, ...updates };

            const { amount_borrowed, interest_rate, modality } = newState;
            
            // --- Start of Refactored Calculation Block ---
            let calculatedAmountToReceive = 0;
            if (typeof amount_borrowed === 'number' && typeof interest_rate === 'number') {
                // This modality represents a monthly interest payment.
                // The 'amount_to_receive' for a given period is just the interest itself.
                // The principal is paid at the end of the loan term.
                if (modality === 'Juros Mensal (+ Principal no final)') {
                    calculatedAmountToReceive = amount_borrowed * (interest_rate / 100);
                } 
                // Other modalities include the principal in the amount to receive.
                else {
                    calculatedAmountToReceive = amount_borrowed * (1 + interest_rate / 100);
                }
            }
            newState.amount_to_receive = calculatedAmountToReceive;
            // --- End of Refactored Calculation Block ---
            
            // Cleanup logic when modality changes
            if ('modality' in updates && updates.modality !== 'Parcelado (Principal + Juros em X vezes)') {
                delete newState.installments;
                delete newState.installments_details;
            }

            return newState;
        });
    }

    const handleGenericChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const isNumberInput = type === 'number';

        let finalValue: any = value;

        if (isCheckbox) {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (isNumberInput) {
            if (value === '') {
                finalValue = undefined;
            } else {
                const num = name === 'interest_rate' ? parseFloat(value) : parseInt(value, 10);
                finalValue = isNaN(num) ? undefined : num;
            }
        }
        handleFormChange({ [name]: finalValue });
    };
    
    const handleCurrencyChange = (name: 'amount_borrowed' | 'daily_late_fee_amount', v: number | undefined) => {
        handleFormChange({ [name]: v });
    };
    
    const handleGenerateInstallments = () => {
        const hasPaidInstallments = formData.installments_details?.some(i => i.status === 'paid');
        if (hasPaidInstallments) {
            if (!window.confirm("Atenção: Existem parcelas já marcadas como pagas. Recalcular irá sobrescrever todas as parcelas e redefini-las como 'Pendente'. Deseja continuar?")) {
                return;
            }
        }

        setFormData(prev => {
            const { modality, installments, amount_to_receive, due_date } = prev;
            if (modality !== 'Parcelado (Principal + Juros em X vezes)' || !installments || !amount_to_receive || !due_date) {
                return prev;
            }
            
            const newInstallments: InstallmentDetail[] = [];
            let firstDueDate = new Date(due_date.split('T')[0] + 'T00:00:00');

            const standardInstallment = Math.floor((amount_to_receive / installments) * 100) / 100;
            let totalAllocated = 0;

            for(let i=0; i < installments; i++) {
                const currentDueDate = new Date(firstDueDate);
                const currentMonth = firstDueDate.getMonth();
                currentDueDate.setMonth(currentMonth + i);
                
                if (currentDueDate.getMonth() !== (currentMonth + i) % 12) {
                    currentDueDate.setDate(0); 
                }

                let amount = standardInstallment;
                if (i === installments - 1) {
                    amount = amount_to_receive - totalAllocated;
                } else {
                    totalAllocated += amount;
                }

                newInstallments.push({
                    installment_number: i + 1,
                    amount: parseFloat(amount.toFixed(2)),
                    due_date: currentDueDate.toISOString(),
                    status: 'pending'
                });
            }
            
            return {
                ...prev,
                installments_details: newInstallments,
                due_date: newInstallments[newInstallments.length - 1].due_date,
                status: 'pending' // Reset status when recalculating
            };
        });
    };

    const handleInstallmentDetailChange = (index: number, field: keyof InstallmentDetail, value: string | number) => {
        setFormData(prev => {
            if (!prev.installments_details) return prev;
    
            const newInstallments = [...prev.installments_details];
            const updatedInstallment = { ...newInstallments[index] };
            (updatedInstallment as any)[field] = value;
            newInstallments[index] = updatedInstallment;
    
            let newState: Partial<Loan> = { ...prev, installments_details: newInstallments };
    
            // Recalculate total amount to receive if an installment amount changes
            if (field === 'amount') {
                newState.amount_to_receive = newInstallments.reduce((sum, inst) => sum + Number(inst.amount), 0);
            }
    
            // 1. Determine the overall loan due date (always the last installment's due date)
            const allDueDates = newInstallments.map(inst => new Date(inst.due_date.split('T')[0] + 'T00:00:00').getTime());
            if (allDueDates.length > 0) {
                const latestDueDate = new Date(Math.max(...allDueDates));
                newState.due_date = latestDueDate.toISOString();
            }
    
            // 2. Determine the overall loan status
            const allInstallmentsPaid = newInstallments.every(i => i.status === 'paid');
            if (allInstallmentsPaid) {
                newState.status = 'paid';
                // Also find the latest payment date to set as the loan's final payment date
                const lastPaymentDate = newInstallments
                    .map(i => i.payment_date ? new Date(i.payment_date).getTime() : 0)
                    .reduce((max, d) => Math.max(max, d), 0);
                if(lastPaymentDate > 0) {
                    newState.payment_date = new Date(lastPaymentDate).toISOString();
                }
            } else {
                // Not fully paid, so clear the final payment date
                newState.payment_date = undefined;
                
                // Check if any pending installment is overdue
                const today = getTodayInBrasilia();
                const isAnyPendingInstallmentOverdue = newInstallments.some(i => 
                    i.status === 'pending' && new Date(i.due_date.split('T')[0] + 'T00:00:00') < today
                );
                
                newState.status = isAnyPendingInstallmentOverdue ? 'overdue' : 'pending';
            }
    
            return newState;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clientId || !formData.amount_borrowed || !formData.due_date || !formData.account_id) {
            alert('Preencha todos os campos obrigatórios, incluindo a conta de origem.');
            return;
        }

        if (formData.modality === 'Parcelado (Principal + Juros em X vezes)' && (!formData.installments_details || formData.installments_details.length === 0)) {
            alert('Para a modalidade parcelada, por favor, gere e confirme as parcelas.');
            return;
        }

        onSave(formData as Loan);
    };

    const MODALITIES: LoanModality[] = [
        'Pagamento Único (Principal + Juros)',
        'Juros Mensal (+ Principal no final)',
        'Parcelado (Principal + Juros em X vezes)',
    ];

    const statusBadge = (status: 'paid' | 'pending') => {
        const config = {
            paid: { text: 'Pago', classes: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
            pending: { text: 'Pendente', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' }
        };
        const currentConfig = config[status];
        return (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${currentConfig.classes}`}>
                {currentConfig.text}
            </span>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={loan ? 'Editar Empréstimo' : 'Novo Empréstimo'} size='2xl'>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}>Cliente</label>
                        <select name="clientId" value={formData.clientId || ''} onChange={handleGenericChange} required className={inputStyle}>
                            <option value="">Selecione um cliente</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelStyle}>Conta de Origem (Débito)</label>
                        <select name="account_id" value={formData.account_id || ''} onChange={handleGenericChange} required className={inputStyle}>
                            <option value="">Selecione uma conta</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}>Modalidade</label>
                        <select name="modality" value={formData.modality} onChange={handleGenericChange} className={inputStyle}>
                            {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    {formData.modality === 'Parcelado (Principal + Juros em X vezes)' && (
                         <div>
                            <label className={labelStyle}>Nº de Parcelas</label>
                            <input type="number" name="installments" value={formData.installments || ''} onChange={handleGenericChange} className={inputStyle} />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}>Valor Emprestado (R$)</label>
                        <CurrencyInput value={formData.amount_borrowed} onChange={(v) => handleCurrencyChange('amount_borrowed', v)} required className={inputStyle} />
                    </div>
                    <div>
                        <label className={labelStyle}>Juros (%)</label>
                        <input type="number" step="0.1" name="interest_rate" value={formData.interest_rate || ''} onChange={handleGenericChange} className={inputStyle} />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Valor a Receber (R$)</label>
                        <p className='text-lg font-bold text-primary-600 dark:text-primary-400'>{formatCurrency(formData.amount_to_receive || 0)}</p>
                    </div>
                     <div>
                        <label className={labelStyle}>Juros de Mora (R$ por dia)</label>
                        <CurrencyInput value={formData.daily_late_fee_amount} onChange={(v) => handleCurrencyChange('daily_late_fee_amount', v)} className={inputStyle} />
                    </div>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}>Data do Empréstimo</label>
                        <input type="date" name="date" value={formData.date ? formData.date.split('T')[0] : ''} onChange={handleGenericChange} required className={inputStyle} />
                    </div>
                    <div>
                        <label className={labelStyle}>{formData.modality === 'Parcelado (Principal + Juros em X vezes)' ? 'Venc. 1ª Parcela' : 'Vencimento'}</label>
                        <input type="date" name="due_date" value={formData.due_date ? formData.due_date.split('T')[0] : ''} onChange={handleGenericChange} required className={inputStyle} />
                    </div>
                 </div>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center">
                        <input id="is_in_negotiation" name="is_in_negotiation" type="checkbox" checked={formData.is_in_negotiation || false} onChange={handleGenericChange} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                        <label htmlFor="is_in_negotiation" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Em Negociação</label>
                    </div>
                    <div>
                        <label className={labelStyle}>Status</label>
                        <select name="status" value={formData.status || 'pending'} onChange={handleGenericChange} required className={inputStyle}>
                           {Object.entries(statusConfig).map(([key, {text}]) => <option key={key} value={key}>{text}</option>)}
                        </select>
                    </div>
                  </div>
                 {formData.modality === 'Parcelado (Principal + Juros em X vezes)' && (
                     <>
                        <Button type="button" variant="secondary" onClick={handleGenerateInstallments} className='w-full'>
                            Gerar/Recalcular Parcelas
                        </Button>
                        {formData.installments_details && formData.installments_details.length > 0 && (
                            <div>
                                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 my-2">Editar Parcelas</h4>
                                <div className='max-h-40 overflow-y-auto space-y-2 pr-2'>
                                    {formData.installments_details.map((inst, index) => (
                                        <div key={inst.installment_number} className={`p-3 rounded-md grid grid-cols-3 gap-x-4 gap-y-2 items-center ${inst.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                             <p className='font-semibold col-span-3'>Parcela {inst.installment_number}</p>
                                             <div>
                                                <label className='text-xs'>Vencimento</label>
                                                <input type="date" value={inst.due_date.split('T')[0]} onChange={(e) => handleInstallmentDetailChange(index, 'due_date', e.target.value)} className={`${inputStyle} !text-xs !py-1`} />
                                             </div>
                                             <div>
                                                <label className='text-xs'>Valor</label>
                                                <CurrencyInput value={inst.amount} onChange={(v) => handleInstallmentDetailChange(index, 'amount', v || 0)} className={`${inputStyle} !text-xs !py-1`} />
                                             </div>
                                             <div>
                                                <label className='text-xs'>Status</label>
                                                 <select value={inst.status} onChange={(e) => handleInstallmentDetailChange(index, 'status', e.target.value)} className={`${inputStyle} !text-xs !py-1`}>
                                                    <option value="pending">Pendente</option>
                                                    <option value="paid">Pago</option>
                                                 </select>
                                             </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                     </>
                 )}
                 <div>
                    <label className={labelStyle}>Observações</label>
                    <textarea name="observation" value={formData.observation || ''} onChange={handleGenericChange} rows={3} className={`${inputStyle} min-h-[80px] resize-y`} placeholder='Adicione uma nota sobre a negociação ou detalhes do empréstimo.'></textarea>
                 </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                </div>
            </form>
        </Modal>
    );
};

interface QuickReceiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (loan: Loan, paymentDate: string, amountPaid: number, accountId: string, installmentNumber?: number, paymentType?: 'interest_only' | 'full') => void;
    loanInfo: {loan: Loan, totalToReceive: number};
    accounts: Account[];
}
const QuickReceiveModal: React.FC<QuickReceiveModalProps> = ({ isOpen, onClose, onSave, loanInfo, accounts }) => {
    const { loan } = loanInfo;
    const pendingInstallments = useMemo(() => loan.installments_details?.filter(i => i.status === 'pending') || [], [loan]);
    
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [amountPaid, setAmountPaid] = useState<number | undefined>(0);
    const [selectedAccountId, setSelectedAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
    const [selectedInstallmentNumber, setSelectedInstallmentNumber] = useState<number | null>(null);
    const [paymentType, setPaymentType] = useState<'interest_only' | 'full'>('interest_only');

    useEffect(() => {
        if(isOpen) {
            setPaymentDate(new Date().toISOString().split('T')[0]);
            if (accounts.length > 0 && !selectedAccountId) {
                setSelectedAccountId(accounts[0].id);
            }

            const isMonthlyInterest = loan.modality === 'Juros Mensal (+ Principal no final)';

            if (isMonthlyInterest) {
                if (paymentType === 'interest_only') {
                     setAmountPaid(loan.amount_to_receive); // This is just the interest
                } else { // 'full'
                     setAmountPaid(loan.amount_borrowed + loan.amount_to_receive);
                }
            } else if (loan.modality === 'Parcelado (Principal + Juros em X vezes)') {
                if (pendingInstallments.length > 0) {
                    const firstPending = pendingInstallments[0];
                    setSelectedInstallmentNumber(firstPending.installment_number);
                    const { totalDue } = calculateInstallmentDueInfo(firstPending, loan);
                    setAmountPaid(totalDue);
                }
            } else { // Pagamento Único
                 const daysOverdue = calculateDaysOverdue(loan.due_date);
                 let finalAmount = loan.amount_to_receive;
                 if (daysOverdue > 0) {
                    const lateFee = daysOverdue * loan.daily_late_fee_amount;
                    finalAmount += lateFee;
                 }
                 setAmountPaid(finalAmount);
                 setSelectedInstallmentNumber(null);
            }
        }
    }, [isOpen, loan, loanInfo.totalToReceive, accounts, selectedAccountId, pendingInstallments, paymentType]);
    
    const handleInstallmentSelection = (installmentNumber: number) => {
        setSelectedInstallmentNumber(installmentNumber);
        const selected = pendingInstallments.find(i => i.installment_number === installmentNumber);
        if (selected) {
            const { totalDue } = calculateInstallmentDueInfo(selected, loan);
            setAmountPaid(totalDue);
        }
    }

    const handleSave = () => {
        if (!selectedAccountId) {
            alert('Por favor, selecione uma conta para creditar o recebimento.');
            return;
        }
        onSave(loan, paymentDate, amountPaid || 0, selectedAccountId, selectedInstallmentNumber || undefined, paymentType);
    }
    
    const totalOpenAmount = useMemo(() => {
        if (loan.modality === 'Juros Mensal (+ Principal no final)') {
            return loan.amount_borrowed + loan.amount_to_receive;
        }
        if (loan.modality === 'Parcelado (Principal + Juros em X vezes)') {
            return pendingInstallments.reduce((sum, i) => {
                const { totalDue } = calculateInstallmentDueInfo(i, loan);
                return sum + totalDue;
            }, 0);
        }
        const daysOverdue = calculateDaysOverdue(loan.due_date);
        const lateFee = daysOverdue * loan.daily_late_fee_amount;
        return loan.amount_to_receive + lateFee;
    }, [loan, pendingInstallments]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Recebimento" size="md">
             <div className="text-center">
                <p className='text-sm text-gray-500 dark:text-gray-400'>Empréstimo de <strong>{loan.clientName}</strong></p>
                <p className="text-gray-600 dark:text-gray-300 mt-4">Valor Total em Aberto</p>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{formatCurrency(totalOpenAmount || 0)}</p>
            </div>
            <div className="mt-6 space-y-4">
                 <div>
                    <label className={labelStyle}>Creditar na Conta</label>
                    <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} required className={inputStyle}>
                        <option value="">Selecione uma conta</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>

                {loan.modality === 'Juros Mensal (+ Principal no final)' && (
                    <div>
                        <label className={labelStyle}>Tipo de Pagamento</label>
                        <div className="mt-2 space-y-2">
                             <label className={`flex items-center p-3 rounded-md border cursor-pointer ${paymentType === 'interest_only' ? 'bg-primary-50 border-primary-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                <input type="radio" name="paymentType" value="interest_only" checked={paymentType === 'interest_only'} onChange={() => setPaymentType('interest_only')} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500" />
                                <span className="ml-3 flex-grow text-sm">Pagar somente Juros</span>
                                <span className="font-semibold text-sm">{formatCurrency(loan.amount_to_receive)}</span>
                            </label>
                             <label className={`flex items-center p-3 rounded-md border cursor-pointer ${paymentType === 'full' ? 'bg-primary-50 border-primary-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                <input type="radio" name="paymentType" value="full" checked={paymentType === 'full'} onChange={() => setPaymentType('full')} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500" />
                                <span className="ml-3 flex-grow text-sm">Quitação Total</span>
                                <span className="font-semibold text-sm">{formatCurrency(loan.amount_borrowed + loan.amount_to_receive)}</span>
                            </label>
                        </div>
                    </div>
                )}

                {loan.modality === 'Parcelado (Principal + Juros em X vezes)' && pendingInstallments.length > 0 && (
                    <div>
                        <label className={labelStyle}>Selecionar Parcela a Pagar</label>
                        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                            {pendingInstallments.map(inst => {
                                const { lateFee, daysOverdue } = calculateInstallmentDueInfo(inst, loan);
                                const isInstallmentOverdue = daysOverdue > 0;
                                return (
                                <label key={inst.installment_number} className={`flex items-center p-3 rounded-md border cursor-pointer ${selectedInstallmentNumber === inst.installment_number ? 'bg-primary-50 border-primary-500' : 'bg-gray-50 dark:bg-gray-700'}`}>
                                    <input 
                                        type="radio"
                                        name="installment"
                                        checked={selectedInstallmentNumber === inst.installment_number}
                                        onChange={() => handleInstallmentSelection(inst.installment_number)}
                                        className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                    />
                                    <div className="ml-3 flex-grow text-sm">
                                        <p>Parcela {inst.installment_number}</p>
                                        {isInstallmentOverdue && <p className="text-xs text-red-500">({daysOverdue} dias atraso)</p>}
                                    </div>
                                    <div className="font-semibold text-sm text-right">
                                        <p>{formatCurrency(inst.amount)}</p>
                                        {isInstallmentOverdue && <p className="text-xs text-red-500">(+{formatCurrency(lateFee)})</p>}
                                    </div>
                                </label>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className={labelStyle}>Valor Recebido</label>
                        <CurrencyInput value={amountPaid} onChange={(v) => setAmountPaid(v)} required className={inputStyle} />
                    </div>
                     <div>
                        <label className={labelStyle}>Data do Recebimento</label>
                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required className={inputStyle} />
                    </div>
                </div>
            </div>
            <div className="flex justify-end space-x-3 pt-6">
                <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave}>Confirmar Recebimento</Button>
            </div>
        </Modal>
    );
}

const AddPromiseModal: React.FC<{ isOpen: boolean, onClose: () => void, onSave: (loan: Loan, promiseDate: string, promiseNote: string) => void, loan: Loan }> = ({ isOpen, onClose, onSave, loan }) => {
    const [promiseDate, setPromiseDate] = useState(new Date().toISOString().split('T')[0]);
    const [promiseNote, setPromiseNote] = useState('');

    useEffect(() => {
        if(isOpen) {
            const today = new Date();
            today.setDate(today.getDate() + 1); // Default promise to tomorrow
            setPromiseDate(today.toISOString().split('T')[0]);
            setPromiseNote('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(loan, promiseDate, promiseNote);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Adicionar Promessa - ${loan.clientName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className={labelStyle}>Nova Data de Vencimento</label>
                    <input type="date" value={promiseDate} onChange={e => setPromiseDate(e.target.value)} required className={inputStyle} />
                </div>
                <div>
                    <label className={labelStyle}>Anotação da Promessa</label>
                    <textarea value={promiseNote} onChange={e => setPromiseNote(e.target.value)} rows={3} required className={`${inputStyle} min-h-[80px] resize-y`} placeholder='Ex: Cliente prometeu pagar na nova data.'></textarea>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Salvar Promessa</Button>
                </div>
            </form>
        </Modal>
    );
};


const LoanHistoryModal: React.FC<{isOpen: boolean, onClose: () => void, loan: Loan}> = ({isOpen, onClose, loan}) => {
    
    const historyItems = useMemo(() => {
        const items = [];
        if (loan.observation) {
            items.push({
                type: 'observation',
                date: loan.date,
                content: `Observação: ${loan.observation}`
            });
        }
        if (loan.promise_history) {
            items.push(...loan.promise_history.map(p => ({
                type: 'promise',
                date: p.date,
                content: `Promessa: ${p.note}${p.promised_due_date ? ` (Novo Venc: ${formatDateForBrasilia(p.promised_due_date)})` : ''}`
            })));
        }
        if (loan.interest_payments_history) {
            items.push(...loan.interest_payments_history.map(p => ({
                type: 'interest_payment',
                date: p.date,
                content: `Pagamento de juros recebido: ${formatCurrency(p.amount_paid)}`
            })));
        }
        if (loan.installments_details) {
            items.push(...loan.installments_details
                .filter(i => i.status === 'paid' && i.payment_date)
                .map(i => ({
                    type: 'payment',
                    date: i.payment_date!,
                    content: `Pagamento da Parcela ${i.installment_number} recebido: ${formatCurrency(i.amount_paid!)}`
                }))
            );
        }
        if (loan.due_date_history) {
            items.push(...loan.due_date_history.map(h => ({
                type: 'date_change',
                date: h.change_date,
                content: `Vencimento alterado de ${formatDateForBrasilia(h.old_due_date)} para ${formatDateForBrasilia(h.new_due_date)}.`
            })))
        }
        return items.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [loan]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Histórico - ${loan.clientName}`}>
            {historyItems.length > 0 ? (
                <div className="space-y-4">
                    {historyItems.map((item, index) => (
                        <div key={index} className="flex items-start space-x-3">
                            <div className={`mt-1 flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                                item.type === 'promise' ? 'bg-purple-500' : 
                                item.type === 'payment' ? 'bg-green-500' :
                                item.type === 'interest_payment' ? 'bg-teal-500' :
                                item.type === 'observation' ? 'bg-gray-500' :
                                'bg-blue-500'
                            }`}>
                                {item.type === 'promise' ? 
                                    <CalendarPlusIcon className="w-4 h-4 text-white" /> : 
                                item.type === 'payment' ?
                                    <CheckCircleIcon className="w-4 h-4 text-white" /> :
                                item.type === 'interest_payment' ?
                                    <DollarSignIcon className="w-4 h-4 text-white" /> :
                                item.type === 'observation' ?
                                    <InfoIcon className="w-4 h-4 text-white" /> :
                                    <PencilIcon className="w-4 h-4 text-white" />
                                }
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.content}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateForBrasilia(item.date)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className='text-center text-gray-500 dark:text-gray-400'>Nenhum histórico de eventos para este empréstimo.</p>
            )}
        </Modal>
    )
}

const InterestDetailModal: React.FC<{isOpen: boolean, onClose: () => void, loan: Loan}> = ({isOpen, onClose, loan}) => {
    const interestValue = loan.modality === 'Juros Mensal (+ Principal no final)'
      ? loan.amount_to_receive
      : loan.amount_to_receive - loan.amount_borrowed;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalhamento dos Juros - ${loan.clientName}`}>
            <div className="space-y-4">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center text-lg">
                        <span className="text-gray-600 dark:text-gray-300">Taxa Aplicada:</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">{loan.interest_rate.toFixed(1)}%</span>
                    </div>
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center text-lg">
                        <span className="text-gray-600 dark:text-gray-300">Valor Total dos Juros:</span>
                        <span className="font-bold text-primary-600 dark:text-primary-400">{formatCurrency(interestValue)}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}