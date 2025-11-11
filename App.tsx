import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { LoansPage } from './components/Loans';
import { ClientsAndAccountsPage } from './components/ClientsAndAccounts';
import { PlansPage } from './components/Plans';
import { ReportsPage } from './components/Reports';
import { Toast, ToastManager } from './components/Shared';
import { SunIcon, MoonIcon, MenuIcon, XIcon, UserCircleIcon, LogoutIcon, HomeIcon, UsersIcon, BanknoteIcon, GemIcon, ChartBarIcon } from './components/Icons';
import type { User, Loan, Client, Account, Plan, ToastMessage, Transaction, DeletionRecord } from './types';
import { MOCK_ACCOUNTS, MOCK_CLIENTS, MOCK_LOANS, MOCK_USER, PLANS, MOCK_TRANSACTIONS } from './constants';

const App: React.FC = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [loans, setLoans] = useState<Loan[]>(MOCK_LOANS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [deletionHistory, setDeletionHistory] = useState<DeletionRecord[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    // Mock authentication check
    setTimeout(() => {
      const enrichedLoans = loans.map(l => ({...l, clientName: clients.find(c => c.id === l.clientId)?.name ?? 'Cliente não encontrado'}));
      setLoans(enrichedLoans);
      setUser(MOCK_USER);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    setLoading(true);
    setTimeout(() => {
      setUser(null);
      setLoading(false);
    }, 500);
  };
  
  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setUser(MOCK_USER);
      setLoading(false);
    }, 500);
  }

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-primary-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ToastManager.Provider value={addToast}>
      <HashRouter>
        {user ? (
          <AuthenticatedLayout 
            user={user} 
            onLogout={handleLogout} 
            theme={theme} 
            toggleTheme={toggleTheme}
            loans={loans}
            setLoans={setLoans}
            clients={clients}
            setClients={setClients}
            accounts={accounts}
            setAccounts={setAccounts}
            transactions={transactions}
            setTransactions={setTransactions}
            deletionHistory={deletionHistory}
            setDeletionHistory={setDeletionHistory}
          />
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
        <div className="fixed top-4 right-4 z-[100] space-y-2">
            {toasts.map(toast => (
                <Toast key={toast.id} id={toast.id} message={toast.message} type={toast.type} onClose={() => setToasts(current => current.filter(t => t.id !== toast.id))} />
            ))}
        </div>
      </HashRouter>
    </ToastManager.Provider>
  );
};

interface AuthenticatedLayoutProps {
    user: User;
    onLogout: () => void;
    theme: string;
    toggleTheme: () => void;
    loans: Loan[];
    setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    accounts: Account[];
    setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    deletionHistory: DeletionRecord[];
    setDeletionHistory: React.Dispatch<React.SetStateAction<DeletionRecord[]>>;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = (props) => {
    const { user, onLogout, theme, toggleTheme } = props;
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header user={user} onLogout={onLogout} theme={theme} toggleTheme={toggleTheme} setSidebarOpen={setSidebarOpen} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
                    <Routes>
                        <Route path="/" element={<Dashboard loans={props.loans} accounts={props.accounts} clients={props.clients} transactions={props.transactions} />} />
                        <Route path="/loans" element={<LoansPage loans={props.loans} setLoans={props.setLoans} clients={props.clients} accounts={props.accounts} setTransactions={props.setTransactions} setDeletionHistory={props.setDeletionHistory} />} />
                        <Route path="/reports" element={<ReportsPage loans={props.loans} clients={props.clients} transactions={props.transactions} accounts={props.accounts} deletionHistory={props.deletionHistory} />} />
                        <Route path="/registrations" element={<ClientsAndAccountsPage 
                                clients={props.clients}
                                accounts={props.accounts}
                                loans={props.loans}
                                transactions={props.transactions}
                                setClients={props.setClients}
                                setAccounts={props.setAccounts}
                                setTransactions={props.setTransactions}
                                setDeletionHistory={props.setDeletionHistory}
                            />} 
                        />
                        <Route path="/plans" element={<PlansPage userPlan={user.plan} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

const Header: React.FC<Omit<AuthenticatedLayoutProps, 'loans' | 'setLoans' | 'clients' | 'setClients' | 'accounts' | 'setAccounts' | 'transactions' | 'setTransactions' | 'deletionHistory' | 'setDeletionHistory'> & {setSidebarOpen: (isOpen: boolean) => void}> = ({ user, onLogout, theme, toggleTheme, setSidebarOpen }) => {
    const plan = PLANS[user.plan];
    const location = useLocation();
    
    const navLinks = [
        {path: '/', name: 'Minhas Finanças'},
        {path: '/loans', name: 'Empréstimos'},
        {path: '/reports', name: 'Relatórios'},
        {path: '/registrations', name: 'Cadastros'},
    ]

    return (
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
                 <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-4 text-gray-500 dark:text-gray-400">
                    <MenuIcon />
                </button>
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white hidden sm:block">KrediApp</h1>
            </div>

            <div className='hidden md:flex items-center gap-4'>
                {navLinks.map(link => (
                     <Link
                        key={link.path}
                        to={link.path}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${location.pathname === link.path ? 'bg-primary-100 text-primary-700 dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                    >
                        {link.name}
                    </Link>
                ))}
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-${plan.color.split('-')[1]}-500 bg-${plan.color.split('-')[1]}-100 dark:bg-opacity-20`}>
                    <GemIcon className="w-4 h-4" />
                    <span className={`text-sm font-bold`}>{plan.name}</span>
                </div>
                <div className='hidden sm:block text-right'>
                    <div className="font-semibold text-sm">{user.name}</div>
                </div>
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
                <button onClick={onLogout} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <LogoutIcon />
                </button>
            </div>
        </header>
    );
}

const Sidebar: React.FC<{isSidebarOpen: boolean; setSidebarOpen: (isOpen: boolean) => void}> = ({isSidebarOpen, setSidebarOpen}) => {
    const location = useLocation();

    const NavLink: React.FC<{to: string; icon: React.ReactNode; children: React.ReactNode}> = ({ to, icon, children }) => {
        const isActive = location.pathname === to;
        return (
            <Link
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 ${isActive ? 'bg-primary-100 dark:bg-gray-700 text-primary-600 dark:text-primary-400' : ''}`}
            >
                {icon}
                <span className="mx-4 font-medium">{children}</span>
            </Link>
        );
    }
    
    return (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)}></div>
            <aside className={`fixed md:hidden z-30 w-64 bg-white dark:bg-gray-800 h-full flex-shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-primary-500">KrediApp</h2>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 dark:text-gray-400">
                      <XIcon />
                    </button>
                </div>
                <nav className="p-4 space-y-2">
                    <NavLink to="/" icon={<HomeIcon />} >Minhas Finanças</NavLink>
                    <NavLink to="/loans" icon={<BanknoteIcon />} >Empréstimos</NavLink>
                    <NavLink to="/reports" icon={<ChartBarIcon />} >Relatórios</NavLink>
                    <NavLink to="/registrations" icon={<UsersIcon />} >Cadastros</NavLink>
                    <NavLink to="/plans" icon={<GemIcon />} >Meu Plano</NavLink>
                </nav>
            </aside>
        </>
    )
}

const LoginPage: React.FC<{onLogin: () => void}> = ({onLogin}) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary-500">KrediApp</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">Seu gestor de empréstimos inteligente.</p>
                </div>
                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
                        <input type="email" id="email" defaultValue="junior@email.com" className="w-full px-3 py-2 mt-1 text-gray-700 bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                    </div>
                    <div>
                        <label htmlFor="password"className="text-sm font-medium text-gray-700 dark:text-gray-200">Senha</label>
                        <input type="password" id="password" defaultValue="senha123" className="w-full px-3 py-2 mt-1 text-gray-700 bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                    </div>
                    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800">
                        Entrar
                    </button>
                </form>
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                    Não tem uma conta? <a href="#" className="font-medium text-primary-600 hover:underline">Cadastre-se</a>
                </p>
            </div>
        </div>
    );
}

export default App;