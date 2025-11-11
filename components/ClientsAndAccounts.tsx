import React, { useMemo, useState, useCallback } from 'react';
import { Card, Button, Modal, useToasts, CurrencyInput, formatDateForBrasilia } from './Shared';
import type { Client, Account, Loan, BankName, Transaction, DeletionRecord } from '../types';
import { BankIcon, PencilIcon, TrashIcon, FileTextIcon, UserCircleIcon, RestoreIcon } from './Icons';

interface ClientsAndAccountsPageProps {
  clients: Client[];
  accounts: Account[];
  loans: Loan[];
  transactions: Transaction[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setDeletionHistory: React.Dispatch<React.SetStateAction<DeletionRecord[]>>;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const inputStyle = "w-full px-3 py-2 mt-1 text-gray-800 bg-white border border-gray-300 rounded-md dark:bg-gray-900 dark:text-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm";
const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";


export const ClientsAndAccountsPage: React.FC<ClientsAndAccountsPageProps> = (props) => {
    const { clients, accounts, loans, transactions, setAccounts, setClients, setTransactions, setDeletionHistory } = props;
    const [isClientModalOpen, setClientModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isAccountModalOpen, setAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [isStatementModalOpen, setStatementModalOpen] = useState(false);
    const [selectedAccountForStatement, setSelectedAccountForStatement] = useState<Account | null>(null);
    const [accountView, setAccountView] = useState<'active' | 'archived'>('active');

    const addToast = useToasts();

  const accountBalances = useMemo(() => {
    return accounts.reduce((acc, account) => {
        const accountTransactions = transactions.filter(t => t.accountId === account.id);
        const balance = account.initial_balance + accountTransactions.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
        acc[account.id] = balance;
        return acc;
    }, {} as Record<string, number>);
  }, [accounts, transactions]);
  
  const filteredAccounts = useMemo(() => {
      if (accountView === 'active') {
          return accounts.filter(a => !a.is_archived);
      }
      return accounts.filter(a => a.is_archived);
  }, [accounts, accountView]);

  const handleOpenStatement = (account: Account) => {
    setSelectedAccountForStatement(account);
    setStatementModalOpen(true);
  }

  // Client Handlers
    const handleSaveClient = (client: Client) => {
        if (editingClient) {
            setClients(prev => prev.map(c => c.id === client.id ? client : c));
            addToast('Cliente atualizado!', 'success');
        } else {
            setClients(prev => [{...client, id: `client-${Date.now()}`}, ...prev]);
            addToast('Cliente cadastrado!', 'success');
        }
        setClientModalOpen(false);
    }
    const handleDeleteClient = (client: Client) => {
        if (window.confirm(`Tem certeza que deseja excluir "${client.name}"? O histórico de empréstimos permanecerá.`)) {
            setClients(prev => prev.filter(c => c.id !== client.id));
            setDeletionHistory(prev => [...prev, {
                type: 'client',
                action: 'deleted',
                name: client.name,
                date: new Date().toISOString()
            }]);
            addToast('Cliente excluído.', 'info');
        }
    }
    const openNewClientModal = () => { setEditingClient(null); setClientModalOpen(true); }
    const openEditClientModal = (client: Client) => { setEditingClient(client); setClientModalOpen(true); }

  // Account Handlers
    const handleSaveAccount = (account: Account) => {
        if (editingAccount) {
            setAccounts(prev => prev.map(a => a.id === account.id ? account : a));
            addToast('Conta atualizada!', 'success');
        } else {
            setAccounts(prev => [{...account, id: `acc-${Date.now()}`}, ...prev]);
            addToast('Conta cadastrada!', 'success');
        }
        setAccountModalOpen(false);
    }
    
    const handleArchiveOrDeleteAccount = (account: Account) => {
        const isAccountInUse = loans.some(l => l.account_id === account.id) || transactions.some(t => t.accountId === account.id);

        if (isAccountInUse) {
            if (window.confirm(`Esta conta possui um histórico de transações e não pode ser excluída. Deseja arquivá-la? A conta ficará oculta, mas seu histórico será mantido.`)) {
                setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, is_archived: true } : a));
                setDeletionHistory(prev => [...prev, { type: 'account', action: 'archived', name: account.name, date: new Date().toISOString() }]);
                addToast('Conta arquivada.', 'info');
            }
        } else {
            if (window.confirm(`Tem certeza que deseja excluir permanentemente a conta "${account.name}"? Esta ação não pode ser desfeita.`)) {
                setAccounts(prev => prev.filter(a => a.id !== account.id));
                setDeletionHistory(prev => [...prev, { type: 'account', action: 'deleted', name: account.name, date: new Date().toISOString() }]);
                addToast('Conta excluída permanentemente.', 'success');
            }
        }
    };
    
    const handleRestoreAccount = (account: Account) => {
        setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, is_archived: false } : a));
        addToast('Conta restaurada.', 'success');
    };

    const handlePermanentDeleteAccount = (account: Account) => {
        if (window.confirm(`Atenção! Esta ação é irreversível e excluirá permanentemente a conta "${account.name}". Deseja continuar?`)) {
            setAccounts(prev => prev.filter(a => a.id !== account.id));
            setDeletionHistory(prev => [...prev, {
                type: 'account',
                action: 'deleted',
                name: account.name,
                date: new Date().toISOString()
            }]);
            addToast('Conta excluída permanentemente.', 'success');
        }
    };

    const openNewAccountModal = () => { setEditingAccount(null); setAccountModalOpen(true); }
    const openEditAccountModal = (account: Account) => { setEditingAccount(account); setAccountModalOpen(true); }

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Contas Bancárias</h2>
            <div className='flex items-center gap-2'>
                <select onChange={e => setAccountView(e.target.value as 'active' | 'archived')} value={accountView} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md dark:bg-gray-900 dark:text-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500">
                    <option value="active">Ativas</option>
                    <option value="archived">Arquivadas</option>
                </select>
                <Button onClick={openNewAccountModal}>+ Nova Conta</Button>
            </div>
        </div>
        <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 hidden md:table">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Conta</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Saldo Inicial</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Saldo Atual</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Ações</th>
                    </tr>
                </thead>
                 <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAccounts.map(account => (
                        <tr key={account.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                    <BankIcon bank={account.bank} />
                                    <span className="font-medium text-gray-800 dark:text-gray-100">{account.name}</span>
                                     {account.is_archived && <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 px-2 py-0.5 rounded-full">Arquivada</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(account.initial_balance)}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${accountBalances[account.id] < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(accountBalances[account.id] ?? 0)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                               {account.is_archived ? (
                                   <>
                                        <button onClick={() => handleRestoreAccount(account)} className="text-gray-400 hover:text-green-500 p-1" title="Restaurar"><RestoreIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handlePermanentDeleteAccount(account)} className="text-gray-400 hover:text-red-500 p-1" title="Excluir Permanentemente"><TrashIcon className="w-4 h-4" /></button>
                                   </>
                               ) : (
                                   <>
                                        <button onClick={() => handleOpenStatement(account)} className="text-gray-400 hover:text-green-500 p-1" title="Extrato"><FileTextIcon className="w-4 h-4" /></button>
                                        <button onClick={() => openEditAccountModal(account)} className="text-gray-400 hover:text-blue-500 p-1" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleArchiveOrDeleteAccount(account)} className="text-gray-400 hover:text-red-500 p-1" title="Excluir/Arquivar"><TrashIcon className="w-4 h-4" /></button>
                                   </>
                               )}
                            </td>
                        </tr>
                    ))}
                 </tbody>
            </table>
            <div className="md:hidden space-y-4">
                {filteredAccounts.map(account => (
                     <div key={account.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700">
                        <div className="flex justify-between items-start">
                             <div className="flex items-center space-x-3">
                                <BankIcon bank={account.bank} />
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-gray-100">{account.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Inicial: {formatCurrency(account.initial_balance)}</p>
                                </div>
                            </div>
                             <div className="flex items-center space-x-2">
                               {account.is_archived ? (
                                   <>
                                        <button onClick={() => handleRestoreAccount(account)} className="text-gray-400 hover:text-green-500 p-1" title="Restaurar"><RestoreIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handlePermanentDeleteAccount(account)} className="text-gray-400 hover:text-red-500 p-1" title="Excluir Permanentemente"><TrashIcon className="w-4 h-4" /></button>
                                   </>
                               ) : (
                                   <>
                                        <button onClick={() => handleOpenStatement(account)} className="text-gray-400 hover:text-green-500 p-1" title="Extrato"><FileTextIcon className="w-4 h-4" /></button>
                                        <button onClick={() => openEditAccountModal(account)} className="text-gray-400 hover:text-blue-500 p-1" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleArchiveOrDeleteAccount(account)} className="text-gray-400 hover:text-red-500 p-1" title="Excluir/Arquivar"><TrashIcon className="w-4 h-4" /></button>
                                   </>
                               )}
                            </div>
                        </div>
                         {account.is_archived && <span className="mt-2 inline-block text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-200 px-2 py-0.5 rounded-full">Arquivada</span>}
                        <div className='mt-2 text-right'>
                             <p className="text-xs text-gray-500 dark:text-gray-400">Saldo Atual</p>
                             <p className={`text-xl font-bold ${accountBalances[account.id] < 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(accountBalances[account.id] ?? 0)}</p>
                        </div>
                     </div>
                ))}
            </div>
             {filteredAccounts.length === 0 && (
                <p className="text-center py-6 text-gray-500 dark:text-gray-400">Nenhuma conta encontrada nesta visualização.</p>
            )}
        </div>
      </Card>
      
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Clientes</h2>
            <Button onClick={openNewClientModal}>+ Novo Cliente</Button>
        </div>
         <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Nome</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden sm:table-cell">Telefone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300 hidden md:table-cell">Cidade</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Ações</th>
                    </tr>
                </thead>
                 <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                     {clients.map(client => (
                        <tr key={client.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-100">{client.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">{client.phone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell">{client.city}</td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <button onClick={() => openEditClientModal(client)} className="text-gray-400 hover:text-blue-500 p-1"><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteClient(client)} className="text-gray-400 hover:text-red-500 p-1"><TrashIcon className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Card>

      <ClientModal isOpen={isClientModalOpen} onClose={() => setClientModalOpen(false)} onSave={handleSaveClient} client={editingClient} />
      <AccountModal isOpen={isAccountModalOpen} onClose={() => setAccountModalOpen(false)} onSave={handleSaveAccount} account={editingAccount} />
      {selectedAccountForStatement && (
        <AccountStatementModal 
            isOpen={isStatementModalOpen} 
            onClose={() => setStatementModalOpen(false)} 
            account={selectedAccountForStatement}
            transactions={transactions}
            setTransactions={setTransactions}
         />
      )}
    </div>
  );
};

// Client Modal
const ClientModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (client: Client) => void, client: Client | null}> = ({ isOpen, onClose, onSave, client }) => {
    const [formData, setFormData] = useState<Partial<Client>>({});
    const [isCepLoading, setCepLoading] = useState(false);

    React.useEffect(() => {
        setFormData(client || {});
    }, [client, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length !== 8) return;
        setCepLoading(true);
        try {
            await new Promise(res => setTimeout(res, 500)); // Simulate network latency
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if(!response.ok) throw new Error('CEP não encontrado');
            const data = await response.json();
            if(data.erro) throw new Error('CEP inválido');
            setFormData(prev => ({
                ...prev,
                cep,
                address: data.logradouro,
                neighborhood: data.bairro,
                city: data.localidade,
                state: data.uf,
            }));
        } catch (error) {
            console.error(error);
            alert('Não foi possível buscar o CEP.');
        } finally {
            setCepLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Client);
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Editar Cliente' : 'Novo Cliente'} size="xl">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <UserCircleIcon className="w-24 h-24 text-gray-300 dark:text-gray-600" />
                </div>
                <div className="flex-grow space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>Nome Completo</label>
                            <input name="name" value={formData.name || ''} onChange={handleChange} required className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>Telefone (com DDD)</label>
                            <input name="phone" value={formData.phone || ''} onChange={handleChange} required className={inputStyle} />
                        </div>
                    </div>
                    <div>
                        <label className={labelStyle}>Email</label>
                        <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputStyle} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div className='relative'>
                            <label className={labelStyle}>CEP</label>
                            <input name="cep" value={formData.cep || ''} onChange={handleChange} onBlur={handleCepBlur} className={inputStyle} />
                            {isCepLoading && (
                               <div className="absolute right-2.5 top-9 w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            )}
                        </div>
                        <div className="col-span-2">
                            <label className={labelStyle}>Endereço</label>
                            <input name="address" value={formData.address || ''} onChange={handleChange} className={inputStyle} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={labelStyle}>Bairro</label>
                            <input name="neighborhood" value={formData.neighborhood || ''} onChange={handleChange} className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>Cidade</label>
                            <input name="city" value={formData.city || ''} onChange={handleChange} className={inputStyle} />
                        </div>
                        <div>
                            <label className={labelStyle}>Estado</label>
                            <input name="state" value={formData.state || ''} onChange={handleChange} className={inputStyle} />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Salvar</Button>
                    </div>
                </div>
            </form>
        </Modal>
    )
}

// Account Modal
const AccountModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (account: Account) => void, account: Account | null}> = ({isOpen, onClose, onSave, account}) => {
     const [formData, setFormData] = useState<Partial<Account>>({});
    
    React.useEffect(() => {
        setFormData(account || { bank: 'other', initial_balance: 0 });
    }, [account, isOpen]);
    
     const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCurrencyChange = (value: number | undefined) => {
        setFormData(prev => ({...prev, initial_balance: value}))
    }

     const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Account);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={account ? 'Editar Conta' : 'Nova Conta'}>
             <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}>Nome da Conta</label>
                        <input name="name" value={formData.name || ''} onChange={handleChange} required className={inputStyle} />
                    </div>
                     <div>
                        <label className={labelStyle}>Banco</label>
                        <select name="bank" value={formData.bank || 'other'} onChange={handleChange} className={inputStyle}>
                            <option value="c6">C6 Bank</option>
                            <option value="nubank">Nubank</option>
                            <option value="inter">Inter</option>
                            <option value="caixa">Caixa</option>
                            <option value="pessoal">Pessoal</option>
                            <option value="itaú">Itaú</option>
                            <option value="bradesco">Bradesco</option>
                            <option value="santander">Santander</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>
                </div>
                 <div>
                    <label className={labelStyle}>Saldo Inicial (R$)</label>
                    <CurrencyInput value={formData.initial_balance} onChange={handleCurrencyChange} required className={inputStyle} />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                </div>
             </form>
        </Modal>
    )
}

// Account Statement Modal
interface StatementItem {
    date: string;
    description: string;
    credit: number;
    debit: number;
    balance: number;
}
interface DailyGroup {
    transactions: StatementItem[];
    dailyCredit: number;
    dailyDebit: number;
    endOfDayBalance: number;
}
interface AccountStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: Account;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}
const AccountStatementModal: React.FC<AccountStatementModalProps> = (props) => {
    const { isOpen, onClose, account, transactions, setTransactions } = props;
    const [isTxnModalOpen, setTxnModalOpen] = useState(false);
    const addToast = useToasts();
    
    const { groupedItems, finalBalance } = useMemo(() => {
        const accountTransactions = transactions
            .filter(t => t.accountId === account.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = account.initial_balance;
        const itemsWithBalance: StatementItem[] = accountTransactions.map(t => {
            const credit = t.type === 'credit' ? t.amount : 0;
            const debit = t.type === 'debit' ? t.amount : 0;
            runningBalance += credit - debit;
            return {
                date: t.date,
                description: t.description,
                credit,
                debit,
                balance: runningBalance
            };
        });

        const grouped = itemsWithBalance.reduce((acc: Record<string, DailyGroup>, item) => {
            const dateKey = formatDateForBrasilia(item.date);
            if (!acc[dateKey]) {
                acc[dateKey] = { transactions: [], dailyCredit: 0, dailyDebit: 0, endOfDayBalance: 0 };
            }
            acc[dateKey].transactions.push(item);
            acc[dateKey].dailyCredit += item.credit;
            acc[dateKey].dailyDebit += item.debit;
            acc[dateKey].endOfDayBalance = item.balance;
            return acc;
        }, {} as Record<string, DailyGroup>);
        
        const sortedGroupedItems = Object.entries(grouped).sort((a, b) => {
            const dateA = new Date(a[0].split('/').reverse().join('-'));
            const dateB = new Date(b[0].split('/').reverse().join('-'));
            return dateB.getTime() - dateA.getTime();
        });

        return { groupedItems: sortedGroupedItems, finalBalance: runningBalance };
    }, [account, transactions]);

    const handleSaveTransaction = (txn: Omit<Transaction, 'id'>) => {
        setTransactions(prev => [{...txn, id: `txn-${Date.now()}`}, ...prev]);
        addToast('Lançamento adicionado!', 'success');
        setTxnModalOpen(false);
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Extrato - ${account.name}`} size='2xl'
            footer={
                <div className='flex justify-between items-center'>
                     <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Saldo Final: </span>
                        <span className={`font-bold text-lg ${finalBalance < 0 ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>{formatCurrency(finalBalance)}</span>
                    </div>
                    <Button onClick={() => setTxnModalOpen(true)}>+ Adicionar Lançamento</Button>
                </div>
            }
        >
            <div className='space-y-4'>
                 <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 p-3 flex justify-between items-center">
                    <h4 className="font-bold text-indigo-800 dark:text-indigo-200">Saldo Inicial</h4>
                    <span className="font-bold text-lg text-indigo-800 dark:text-indigo-200">{formatCurrency(account.initial_balance)}</span>
                </div>
                {groupedItems.map(([date, group]) => (
                     <div key={date} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 mb-2 border-b border-gray-200 dark:border-gray-600">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100">{date}</h4>
                            <div className='text-xs text-right space-x-2 sm:space-x-4 mt-1 sm:mt-0'>
                                <span className='text-green-600'>Créditos: {formatCurrency(group.dailyCredit)}</span>
                                <span className='text-red-600'>Débitos: {formatCurrency(group.dailyDebit)}</span>
                                <span className='font-semibold text-gray-700 dark:text-gray-300'>Saldo Dia: {formatCurrency(group.endOfDayBalance)}</span>
                            </div>
                        </div>
                        <div className='space-y-2'>
                        {group.transactions.map((item, index) => (
                             <div key={index} className="flex justify-between items-center text-sm pl-2">
                                 <span>{item.description}</span>
                                 <span className={item.credit > item.debit ? 'text-green-500' : 'text-red-500'}>
                                     {formatCurrency(item.credit > item.debit ? item.credit : -item.debit)}
                                 </span>
                             </div>
                        ))}
                        </div>
                    </div>
                ))}
                 {groupedItems.length === 0 && (transactions.length > 0 ? null : <p className="text-center py-4 text-gray-500">Nenhuma movimentação encontrada.</p>)}
            </div>
             <TransactionModal 
                isOpen={isTxnModalOpen} 
                onClose={() => setTxnModalOpen(false)} 
                onSave={handleSaveTransaction}
                accountId={account.id}
             />
        </Modal>
    );
}

// Manual Transaction Modal
const TransactionModal: React.FC<{isOpen: boolean, onClose: () => void, onSave: (txn: Omit<Transaction, 'id'>) => void, accountId: string}> = ({isOpen, onClose, onSave, accountId}) => {
    const [formData, setFormData] = useState({description: '', amount: undefined as number | undefined, type: 'debit' as 'credit' | 'debit', date: new Date().toISOString().split('T')[0]});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, accountId, amount: formData.amount || 0 });
        setFormData({description: '', amount: undefined, type: 'debit', date: new Date().toISOString().split('T')[0]});
    }
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    }
     const handleCurrencyChange = (value: number | undefined) => {
        setFormData(prev => ({...prev, amount: value}))
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Novo Lançamento Manual">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelStyle}>Tipo</label>
                        <select name="type" value={formData.type} onChange={handleChange} className={inputStyle}>
                            <option value="debit">Saída (Débito)</option>
                            <option value="credit">Entrada (Crédito)</option>
                        </select>
                    </div>
                     <div>
                        <label className={labelStyle}>Valor (R$)</label>
                        <CurrencyInput value={formData.amount} onChange={handleCurrencyChange} required className={inputStyle} />
                    </div>
                 </div>
                 <div>
                    <label className={labelStyle}>Descrição</label>
                    <input name="description" value={formData.description} onChange={handleChange} required className={inputStyle} />
                 </div>
                 <div>
                    <label className={labelStyle}>Data</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className={inputStyle} />
                 </div>
                 <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                </div>
            </form>
        </Modal>
    )
}