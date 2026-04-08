import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, Eye, Target, Sparkles, X, Plus, Wallet, ArrowUpRight, Receipt as ReceiptIcon, Search, Filter, Download, AlertTriangle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import SmartBot from '../components/SmartBot';
import { distributeBudget } from '../api/budgetApi';
import { addExpense, getExpenseStats, setBudget, getBudget, ExpenseStats } from '../api/expenseApi';

interface CategoryAllocation {
  category: string;
  amount: number;
  percentage: number;
  reason: string;
  spent?: number;
  remaining?: number;
  priority?: 'high' | 'medium' | 'low';
}

interface BudgetResult {
  budget_amount: number;
  period: string;
  allocations: CategoryAllocation[];
}

export default function Expenses() {
  // Get user from sessionStorage (from auth) - tab-isolated
  const userDataStr = sessionStorage.getItem('expense_user');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const userId = userData?.id || '1'; // Fallback to '1' for testing
  
  const currentPeriod = new Date().toISOString().slice(0, 7); // Current month YYYY-MM
  
  const [budgetData, setBudgetData] = useState<BudgetResult | null>(null);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [budgetMode, setBudgetMode] = useState<'set' | 'add'>('set'); // New: track mode
  const [uploadedReceipt, setUploadedReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('Month');

  const categories = [
    'Food & Dining',
    'Bills & Utilities',
    'Transport',
    'Shopping',
    'Entertainment',
    'Healthcare',
    'Savings',
    'Other'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadStats(), loadRecentExpenses(), loadBudgetData()]);
  };

  const loadStats = async () => {
    try {
      const statsData = await getExpenseStats(userId);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Set default stats
      setStats({ today: 0, week: 0, month: 0, largest: 0, since_budget: 0, by_category: {} });
    }
  };

  const loadRecentExpenses = async () => {
    try {
      const { getExpenses } = await import('../api/expenseApi');
      const expenses = await getExpenses(userId);
      console.log('Loaded expenses:', expenses);
      
      // Sort by created_at timestamp (when expense was added) for truly recent first
      // If no created_at, fall back to date
      const sortedExpenses = expenses.sort((a, b) => {
        const timeA = (a as any).created_at ? new Date((a as any).created_at).getTime() : new Date(a.date).getTime();
        const timeB = (b as any).created_at ? new Date((b as any).created_at).getTime() : new Date(b.date).getTime();
        return timeB - timeA; // Most recently added first
      }).slice(0, 50);
      
      console.log('Setting recent expenses (newest first):', sortedExpenses.length);
      setRecentExpenses(sortedExpenses);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setRecentExpenses([]);
    }
  };

  const loadBudgetData = async () => {
    setLoading(true);
    try {
      // Check if user has budget
      const budgetResp = await getBudget(userId, currentPeriod);
      
      if (!budgetResp.success || !budgetResp.budget) {
        setLoading(false);
        return;
      }

      // Get fresh stats to get category spending
      const currentStats = await getExpenseStats(userId);
      setStats(currentStats);

      const result = await distributeBudget({
        user_id: userId,
        budget_amount: budgetResp.budget.amount,
        period: currentPeriod,
        use_forecast: true,
        preferences: {
          savings_percent: 10,
          min_reserve: 500
        }
      });

      // Enrich with REAL spent amounts from stats by category
      const enrichedAllocations = result.allocations.map(alloc => {
        const spent = currentStats.by_category[alloc.category] || 0;
        const remaining = Math.max(0, alloc.amount - spent);
        const priority = alloc.percentage > 20 ? 'high' : alloc.percentage > 10 ? 'medium' : 'low';
        return { ...alloc, spent, remaining, priority } as CategoryAllocation;
      });

      setBudgetData({
        ...result,
        allocations: enrichedAllocations
      });
    } catch (error) {
      console.error('Failed to load budget:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetBudget = async () => {
    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      alert('Please enter a valid budget amount');
      return;
    }

    try {
      setIsUpdatingBudget(true);
      
      // Calculate final budget amount
      let finalBudgetAmount = parseFloat(budgetAmount);
      
      if (budgetMode === 'add' && budgetData) {
        // ADD to existing budget
        finalBudgetAmount = budgetData.budget_amount + parseFloat(budgetAmount);
      }
      
      // Set/Update budget in database
      await setBudget({
        user_id: userId,
        amount: finalBudgetAmount,
        period: currentPeriod
      });

      // Redistribute budget with Prophet AI (NEW allocations based on final amount)
      const result = await distributeBudget({
        user_id: userId,
        budget_amount: finalBudgetAmount,
        period: currentPeriod,
        use_forecast: true,
        preferences: {
          savings_percent: 10,
          min_reserve: 500
        }
      });

      // Get current stats for spent amounts
      const currentStats = await getExpenseStats(userId);
      
      // Apply spent amounts to NEW allocations
      const enrichedAllocations = result.allocations.map(alloc => {
        const spent = currentStats.by_category[alloc.category] || 0;
        const remaining = Math.max(0, alloc.amount - spent);
        const priority = alloc.percentage > 20 ? 'high' : alloc.percentage > 10 ? 'medium' : 'low';
        return { ...alloc, spent, remaining, priority } as CategoryAllocation;
      });

      setBudgetData({
        budget_amount: finalBudgetAmount, // Set the correct updated budget amount
        period: result.period,
        allocations: enrichedAllocations
      });

      setStats(currentStats);
      setShowBudgetModal(false);
      setBudgetAmount('');
      setBudgetMode('set');
    } catch (error: any) {
      console.error('Failed to set budget:', error);
      const errorMsg = error?.response?.data?.detail?.message || error?.message || 'Failed to set budget. Please try again.';
      alert(errorMsg);
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.category || !expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await addExpense({
        user_id: userId,
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        date: expenseForm.date
      });

      setShowExpenseModal(false);
      setExpenseForm({
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      await loadData();
    } catch (error: any) {
      console.error('Failed to add expense:', error);
      
      // Check if it's a budget exceeded error
      const errorDetail = error?.response?.data?.detail;
      
      if (errorDetail?.budget_exceeded) {
        // Budget exceeded - show detailed alert
        const message = errorDetail.message || 
          `Budget Exceeded!\n\n` +
          `Budget: $${errorDetail.budget_amount?.toFixed(2) || 0}\n` +
          `Already Spent: $${errorDetail.total_spent?.toFixed(2) || 0}\n` +
          `Remaining: $${errorDetail.remaining?.toFixed(2) || 0}\n` +
          `Attempted Expense: $${errorDetail.attempted_amount?.toFixed(2) || 0}\n\n` +
          `This expense would exceed your budget by $${errorDetail.would_exceed_by?.toFixed(2) || 0}`;
        
        alert(message);
      } else {
        // Generic error
        const errorMsg = errorDetail?.message || error?.message || 'Failed to add expense. Please try again.';
        alert(errorMsg);
      }
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploadedReceipt(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Process receipt
    await processReceipt(file);
  };

  const processReceipt = async (file: File) => {
    setIsProcessingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8006/api/expenses/upload-receipt', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        setExtractedData(result.data);
        // Pre-fill expense form with extracted data
        setExpenseForm({
          category: result.data.category || '',
          amount: result.data.amount?.toString() || '',
          description: result.data.merchant || '',
          date: result.data.date || new Date().toISOString().split('T')[0]
        });
      } else {
        alert('Failed to extract data from receipt. Please enter manually.');
      }
    } catch (error) {
      console.error('Failed to process receipt:', error);
      alert('Failed to process receipt. Please try again or enter manually.');
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  const handleSaveReceiptExpense = async () => {
    await handleAddExpense();
    // Close receipt modal and reset state
    setShowReceiptModal(false);
    setUploadedReceipt(null);
    setReceiptPreview('');
    setExtractedData(null);
  };

  const getFilteredExpenses = () => {
    let filtered = [...recentExpenses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(exp => 
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== 'All') {
      filtered = filtered.filter(exp => exp.category === filterCategory);
    }

    // Date range filter
    if (filterDateRange !== 'All') {
      const now = new Date();
      const expenseDate = (exp: any) => new Date(exp.date);
      
      switch (filterDateRange) {
        case 'Today':
          filtered = filtered.filter(exp => {
            const eDate = expenseDate(exp);
            return eDate.toDateString() === now.toDateString();
          });
          break;
        case 'Week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(exp => expenseDate(exp) >= weekAgo);
          break;
        case 'Month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(exp => expenseDate(exp) >= monthAgo);
          break;
      }
    }

    return filtered;
  };

  const exportToCSV = () => {
    const filtered = getFilteredExpenses();
    if (filtered.length === 0) {
      alert('No expenses to export');
      return;
    }

    const headers = ['Date', 'Category', 'Amount', 'Description'];
    const csvData = filtered.map(exp => [
      exp.date,
      exp.category,
      exp.amount,
      exp.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredExpenses = getFilteredExpenses();

  const getPriorityBadge = (priority?: 'high' | 'medium' | 'low') => {
    if (priority === 'high') {
      return <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded">High</span>;
    }
    if (priority === 'medium') {
      return <span className="px-2 py-1 bg-amber-50 text-amber-600 text-xs font-medium rounded">Medium</span>;
    }
    return <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded">Low</span>;
  };

  const statsCards = [
    {
      label: "Today's Spending",
      amount: stats?.today || 0,
      icon: DollarSign,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      label: "This Week",
      amount: stats?.week || 0,
      icon: TrendingUp,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600'
    },
    {
      label: "This Month",
      amount: stats?.month || 0,
      icon: Calendar,
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-600'
    },
    {
      label: "Largest Purchase",
      amount: stats?.largest || 0,
      icon: Eye,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    }
  ];

  const totalBudget = budgetData?.budget_amount || 0;
  const totalSpent = stats?.since_budget || 0; // Use spending since budget was set
  const available = totalBudget - totalSpent;
  const emergencyFund = totalBudget * 0.1; // 10% as emergency

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-purple-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-violet-500 to-purple-500 p-3.5 rounded-2xl shadow-lg shadow-violet-500/30">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Daily Expenses
                </h1>
                <p className="text-slate-600 flex items-center gap-2 mt-1">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Smart budget tracking with AI
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowReceiptModal(true)}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-cyan-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
              >
                <ReceiptIcon className="w-5 h-5" />
                Scan Receipt
              </button>
              <button 
                onClick={() => setShowExpenseModal(true)}
                className="px-6 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/30 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Expense
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-2xl transition-all hover:-translate-y-1 duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${stat.bgColor} p-3.5 rounded-xl shadow-lg`}>
                      <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 font-medium mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">₹{stat.amount.toFixed(2)}</p>
                </div>
              );
            })}
          </div>

          {/* Budget Progress Bar */}
          {budgetData && totalBudget > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-slate-200 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-violet-500 to-purple-500 p-2.5 rounded-xl shadow-lg">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Monthly Budget Progress</h3>
                    <p className="text-sm text-slate-600">
                      ₹{totalSpent.toFixed(2)} of ₹{totalBudget.toFixed(2)} spent
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    {((totalSpent / totalBudget) * 100).toFixed(0)}%
                  </p>
                  <p className="text-sm text-slate-600">Used</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative">
                <div className="w-full h-8 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200">
                  <div
                    className={`h-full transition-all duration-700 ease-out ${
                      (totalSpent / totalBudget) * 100 >= 90
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : (totalSpent / totalBudget) * 100 >= 75
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                        : (totalSpent / totalBudget) * 100 >= 50
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-400'
                        : 'bg-gradient-to-r from-emerald-500 to-green-500'
                    } relative`}
                    style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"></div>
                  </div>
                </div>
                
                {/* Milestone markers */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-slate-300"></div>
                <div className="absolute top-10 left-1/2 -translate-x-1/2 text-xs text-slate-500 font-medium">50%</div>
              </div>

              {/* Budget Alert Banner */}
              {(totalSpent / totalBudget) * 100 >= 85 && (
                <div className={`mt-4 p-4 rounded-xl border-2 flex items-start gap-3 ${
                  (totalSpent / totalBudget) * 100 >= 100
                    ? 'bg-red-50 border-red-200'
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    (totalSpent / totalBudget) * 100 >= 100 ? 'text-red-600' : 'text-orange-600'
                  }`} />
                  <div className="flex-1">
                    <h4 className={`font-bold mb-1 ${
                      (totalSpent / totalBudget) * 100 >= 100 ? 'text-red-900' : 'text-orange-900'
                    }`}>
                      {(totalSpent / totalBudget) * 100 >= 100 ? '🚨 Budget Exceeded!' : '⚠️ Budget Alert!'}
                    </h4>
                    <p className={`text-sm ${
                      (totalSpent / totalBudget) * 100 >= 100 ? 'text-red-700' : 'text-orange-700'
                    }`}>
                      {(totalSpent / totalBudget) * 100 >= 100
                        ? `You've exceeded your budget by ₹${(totalSpent - totalBudget).toFixed(2)}. Consider reviewing your expenses.`
                        : `You've used ${((totalSpent / totalBudget) * 100).toFixed(0)}% of your budget. Only ₹${(totalBudget - totalSpent).toFixed(2)} remaining.`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-600 font-medium mb-1">Spent</p>
                  <p className="text-lg font-bold text-slate-900">₹{totalSpent.toFixed(0)}</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-xs text-slate-600 font-medium mb-1">Remaining</p>
                  <p className="text-lg font-bold text-emerald-600">₹{Math.max(0, totalBudget - totalSpent).toFixed(0)}</p>
                </div>
                <div className="text-center p-3 bg-violet-50 rounded-xl border border-violet-200">
                  <p className="text-xs text-slate-600 font-medium mb-1">Budget</p>
                  <p className="text-lg font-bold text-violet-600">₹{totalBudget.toFixed(0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Smart Budget Balance Section */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 mb-8 shadow-2xl border border-slate-700 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-emerald-400 to-cyan-400 p-3 rounded-xl shadow-lg">
                    <Sparkles className="w-6 h-6 text-slate-900" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Smart Budget Balance</h2>
                    <p className="text-sm text-slate-300 flex items-center gap-2 mt-1">
                      Prophet AI Active <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setBudgetMode('set');
                      setShowBudgetModal(true);
                    }}
                    className="px-5 py-2.5 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors shadow-lg flex items-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    {budgetData ? 'Update' : 'Set Budget'}
                  </button>
                  {budgetData && (
                    <button 
                      onClick={() => {
                        setBudgetMode('add');
                        setShowBudgetModal(true);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Money
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-semibold text-slate-300">Total Budget</p>
                  </div>
                  <p className="text-4xl font-bold text-white">₹{totalBudget.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-semibold text-slate-300">Available for Spending</p>
                  </div>
                  <p className="text-4xl font-bold text-emerald-400">₹{available.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <DollarSign className="w-5 h-5 text-violet-400" />
                    <p className="text-sm font-semibold text-slate-300">Emergency Fund</p>
                  </div>
                  <p className="text-4xl font-bold text-violet-400">₹{emergencyFund.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Prophet AI Budget Allocations */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 rounded-xl">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Prophet AI Budget Allocations</h2>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-600 mx-auto"></div>
                <p className="mt-4 text-slate-600 font-medium">Loading allocations...</p>
              </div>
            ) : !budgetData ? (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-10 h-10 text-slate-600" />
                </div>
                <p className="text-slate-600 mb-4 text-lg">No budget set yet</p>
                <button 
                  onClick={() => setShowBudgetModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  Set Budget
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgetData.allocations.map((allocation, index) => {
                  const spentPercentage = ((allocation.spent || 0) / allocation.amount) * 100;
                  const isWarning = spentPercentage >= 80 && spentPercentage < 100;
                  const isDanger = spentPercentage >= 100;
                  
                  return (
                  <div key={index} className={`bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border ${isDanger ? 'border-red-400 shadow-red-200' : isWarning ? 'border-orange-400 shadow-orange-200' : 'border-slate-200'} hover:border-violet-300 hover:shadow-xl transition-all duration-200 relative`}>
                    {/* Alert Badge */}
                    {(isWarning || isDanger) && (
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-lg flex items-center gap-1.5 ${isDanger ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-bold">{isDanger ? 'Over Budget!' : 'Warning'}</span>
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-900">{allocation.category}</h3>
                      {getPriorityBadge(allocation.priority)}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-slate-600">
                        <span className="text-sm font-medium">Allocated:</span>
                        <span className="font-semibold text-slate-900">₹{allocation.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="text-sm font-medium">Spent:</span>
                        <span className={`font-semibold ${isDanger ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-slate-900'}`}>
                          ₹{allocation.spent?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            isDanger ? 'bg-gradient-to-r from-red-600 to-red-700' : 
                            isWarning ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                            'bg-gradient-to-r from-violet-600 to-purple-600'
                          }`}
                          style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 text-right">{spentPercentage.toFixed(1)}% used</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-300">
                      <span className="text-sm font-medium text-slate-600">Remaining:</span>
                      <span className={`text-lg font-bold ${isDanger ? 'text-red-600' : 'text-emerald-600'}`}>
                        ₹{(allocation.remaining && allocation.remaining > 0) ? allocation.remaining.toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Expenses */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2.5 rounded-xl">
                  <ReceiptIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Recent Expenses</h2>
              </div>
              <button
                onClick={exportToCSV}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Week">Last 7 Days</option>
                  <option value="Month">Last 30 Days</option>
                </select>
              </div>
            </div>
            
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ReceiptIcon className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-600">
                  {recentExpenses.length === 0 ? 'No expenses yet. Add your first expense above!' : 'No expenses match your filters'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold rounded-lg">
                          {expense.category}
                        </span>
                        <span className="text-sm text-slate-500 font-medium">{expense.date}</span>
                      </div>
                      <p className="text-base font-medium text-slate-900">{expense.description || 'No description'}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-slate-900">₹{expense.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">
                {budgetMode === 'add' ? 'Add Money to Budget' : (budgetData ? 'Update Budget' : 'Set Budget')}
              </h3>
              <button 
                onClick={() => {
                  setShowBudgetModal(false);
                  setBudgetMode('set');
                }} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {budgetMode === 'add' && budgetData && (
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-900 font-medium">
                  Current Budget: <span className="font-bold text-lg">₹{budgetData.budget_amount.toFixed(2)}</span>
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {budgetMode === 'add' ? 'Amount to Add (₹)' : 'Budget Amount (₹)'}
              </label>
              <input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder={budgetMode === 'add' ? 'e.g., 3000' : 'e.g., 10000'}
                className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-lg"
              />
            </div>

            {budgetMode === 'add' && budgetAmount && budgetData && (
              <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-sm text-emerald-900 font-medium">
                  New Budget: <span className="font-bold text-lg">₹{(budgetData.budget_amount + parseFloat(budgetAmount || '0')).toFixed(2)}</span>
                </p>
              </div>
            )}

            <button
              onClick={handleSetBudget}
              disabled={isUpdatingBudget}
              className="w-full px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingBudget ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </span>
              ) : (
                budgetMode === 'add' ? 'Add Money' : (budgetData ? 'Update Budget' : 'Set Budget')
              )}
            </button>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Add New Expense</h3>
              <button 
                onClick={() => setShowExpenseModal(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (₹) *</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="e.g., 500"
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g., Lunch at restaurant"
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleAddExpense}
              className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Add Expense
            </button>
          </div>
        </div>
      )}

      {/* Receipt Scanner Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Scan Receipt</h3>
                <p className="text-slate-600 text-sm mt-1">Upload or capture a receipt to extract expense details</p>
              </div>
              <button 
                onClick={() => {
                  setShowReceiptModal(false);
                  setUploadedReceipt(null);
                  setReceiptPreview('');
                  setExtractedData(null);
                }} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!receiptPreview ? (
              <div className="space-y-4">
                <label 
                  htmlFor="receipt-upload"
                  className="block border-3 border-dashed border-slate-300 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all"
                >
                  <ReceiptIcon className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <p className="text-lg font-semibold text-slate-700 mb-2">Upload Receipt Image</p>
                  <p className="text-sm text-slate-500">Click to browse or drag and drop</p>
                  <p className="text-xs text-slate-400 mt-2">Supports JPG, PNG (Max 10MB)</p>
                </label>
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Receipt Preview */}
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Receipt Preview</p>
                  <img 
                    src={receiptPreview} 
                    alt="Receipt" 
                    className="w-full h-64 object-contain rounded-xl border-2 border-slate-200"
                  />
                  <button
                    onClick={() => {
                      setUploadedReceipt(null);
                      setReceiptPreview('');
                      setExtractedData(null);
                    }}
                    className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Upload Different Image
                  </button>
                </div>

                {/* Processing Indicator */}
                {isProcessingReceipt && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-sm font-semibold text-blue-700">Processing receipt...</p>
                    <p className="text-xs text-blue-600 mt-1">Extracting expense details</p>
                  </div>
                )}

                {/* Extracted Data Form */}
                {extractedData && !isProcessingReceipt && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-800">Data Extracted Successfully</p>
                      </div>
                      <p className="text-xs text-emerald-700">
                        Confidence: <span className="font-bold">{extractedData.confidence}</span>
                        {extractedData.merchant && ` • Merchant: ${extractedData.merchant}`}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                      <p className="text-sm font-semibold text-slate-700 mb-3">Review & Edit Details</p>
                      
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Category *</label>
                        <select
                          value={expenseForm.category}
                          onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                          className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Amount (₹) *</label>
                        <input
                          type="number"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                        <input
                          type="text"
                          value={expenseForm.description}
                          onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                          className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                        <input
                          type="date"
                          value={expenseForm.date}
                          onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                          className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      {extractedData.items && extractedData.items.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Items on Receipt</label>
                          <div className="bg-white rounded-xl border-2 border-slate-200 p-3 max-h-32 overflow-y-auto">
                            {extractedData.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm py-1">
                                <span className="text-slate-700">{item.item}</span>
                                <span className="text-slate-900 font-semibold">₹{item.price}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSaveReceiptExpense}
                      disabled={!expenseForm.category || !expenseForm.amount}
                      className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Expense
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Smart Bot Assistant */}
      <SmartBot stats={stats} expenses={recentExpenses} budget={budgetData} />
    </div>
  );
}
