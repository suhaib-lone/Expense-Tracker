import { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles, TrendingUp, AlertCircle, Lightbulb, DollarSign } from 'lucide-react';

interface BotMessage {
  id: number;
  type: 'tip' | 'warning' | 'insight' | 'celebration';
  title: string;
  message: string;
  icon: 'sparkles' | 'trending' | 'alert' | 'lightbulb' | 'dollar';
}

interface SmartBotProps {
  stats?: any;
  expenses?: any[];
  budget?: any;
}

export default function SmartBot({ stats, expenses, budget }: SmartBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    generateSmartInsights();
  }, [stats, expenses, budget]);

  const generateSmartInsights = () => {
    const insights: BotMessage[] = [];
    let id = 1;

    // Budget status check - Simple and clear
    if (budget && budget.budget_amount > 0) {
      const spent = budget.allocations?.reduce((sum: number, alloc: any) => sum + (alloc.spent || 0), 0) || 0;
      const remaining = budget.budget_amount - spent;
      const percentage = (spent / budget.budget_amount) * 100;
      
      if (percentage >= 90) {
        insights.push({
          id: id++,
          type: 'warning',
          title: '⚠️ Budget Almost Used',
          message: `You have ₹${remaining.toFixed(0)} left out of ₹${budget.budget_amount.toFixed(0)} budget. Try to save more!`,
          icon: 'alert'
        });
      } else if (percentage >= 75) {
        insights.push({
          id: id++,
          type: 'warning',
          title: '⚡ Budget Check',
          message: `You used ${percentage.toFixed(0)}% of your budget. You have ₹${remaining.toFixed(0)} left. Spend wisely!`,
          icon: 'alert'
        });
      } else if (percentage < 50) {
        insights.push({
          id: id++,
          type: 'celebration',
          title: '🎉 Good Saving!',
          message: `Great job! You only spent ₹${spent.toFixed(0)} out of ₹${budget.budget_amount.toFixed(0)}. You have ₹${remaining.toFixed(0)} left!`,
          icon: 'sparkles'
        });
      }
    }

    // Category budget check - Simple comparison
    if (budget?.allocations && budget.allocations.length > 0) {
      const overBudgetCategories = budget.allocations.filter((alloc: any) => 
        alloc.spent > alloc.amount
      );

      if (overBudgetCategories.length > 0) {
        const cat = overBudgetCategories[0];
        const extra = cat.spent - cat.amount;
        insights.push({
          id: id++,
          type: 'warning',
          title: '📊 Category Over Budget',
          message: `${cat.category}: You spent ₹${cat.spent.toFixed(0)} but budget was ₹${cat.amount.toFixed(0)}. That's ₹${extra.toFixed(0)} extra!`,
          icon: 'trending'
        });
      } else {
        // Find category with most remaining budget
        const bestCategory = budget.allocations.reduce((best: any, alloc: any) => {
          const remaining = alloc.amount - alloc.spent;
          const bestRemaining = best.amount - best.spent;
          return remaining > bestRemaining ? alloc : best;
        });
        const remaining = bestCategory.amount - bestCategory.spent;
        if (remaining > 100) {
          insights.push({
            id: id++,
            type: 'celebration',
            title: '💰 Good News!',
            message: `${bestCategory.category}: You have ₹${remaining.toFixed(0)} left. You're doing great in this category!`,
            icon: 'dollar'
          });
        }
      }
    }

    // Daily spending check - Simple average
    if (budget && expenses && expenses.length > 0) {
      const daysInMonth = 30;
      const dailyBudget = budget.budget_amount / daysInMonth;
      const today = new Date().toISOString().split('T')[0];
      const todayExpenses = expenses
        .filter((exp: any) => exp.date === today)
        .reduce((sum: number, exp: any) => sum + exp.amount, 0);

      if (todayExpenses > dailyBudget * 2) {
        insights.push({
          id: id++,
          type: 'warning',
          title: '⚡ High Spending Today',
          message: `You spent ₹${todayExpenses.toFixed(0)} today. Your daily budget is ₹${dailyBudget.toFixed(0)}. Try to spend less tomorrow!`,
          icon: 'alert'
        });
      } else if (todayExpenses < dailyBudget * 0.5) {
        insights.push({
          id: id++,
          type: 'tip',
          title: '💡 Low Spending Day',
          message: `You only spent ₹${todayExpenses.toFixed(0)} today. Your daily budget is ₹${dailyBudget.toFixed(0)}. Keep it up!`,
          icon: 'lightbulb'
        });
      }
    }

    // Simple savings tip
    if (insights.length < 3) {
      insights.push({
        id: id++,
        type: 'tip',
        title: '💡 Savings Tip',
        message: 'Set aside 10% of your budget for emergencies. Small savings today = big security tomorrow!',
        icon: 'dollar'
      });
    }

    // General tip if no insights
    if (insights.length === 0) {
      insights.push({
        id: id++,
        type: 'tip',
        title: '💡 Getting Started',
        message: 'Keep tracking your expenses every day. This helps you understand where your money goes!',
        icon: 'lightbulb'
      });
    }

    setMessages(insights);
    if (insights.length > 0) {
      setHasNewMessage(true);
    }
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'sparkles':
        return <Sparkles className="w-5 h-5" />;
      case 'trending':
        return <TrendingUp className="w-5 h-5" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5" />;
      case 'dollar':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'tip':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'celebration':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-purple-500 hover:bg-purple-600';
    }
  };

  const getMessageColorClasses = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-orange-200 bg-orange-50';
      case 'tip':
        return 'border-blue-200 bg-blue-50';
      case 'celebration':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-purple-200 bg-purple-50';
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
  };

  const nextMessage = () => {
    setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
  };

  const prevMessage = () => {
    setCurrentMessageIndex((prev) => (prev - 1 + messages.length) % messages.length);
  };

  if (messages.length === 0) return null;

  const currentMessage = messages[currentMessageIndex];

  return (
    <>
      {/* Floating Bot Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 z-50 ${getColorClasses(currentMessage.type)}`}
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {hasNewMessage && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
          )}
        </button>
      )}

      {/* Bot Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border-2 border-purple-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">ExpenseAI Assistant</h3>
                <p className="text-purple-100 text-xs">Your smart spending advisor</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className={`rounded-xl p-5 border-2 ${getMessageColorClasses(currentMessage.type)}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getColorClasses(currentMessage.type)}`}>
                  {getIcon(currentMessage.icon)}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 mb-2">{currentMessage.title}</h4>
                  <p className="text-slate-700 text-sm leading-relaxed">{currentMessage.message}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            {messages.length > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={prevMessage}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">
                  {currentMessageIndex + 1} / {messages.length}
                </span>
                <button
                  onClick={nextMessage}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              💡 Powered by AI • Analyzing your spending patterns
            </p>
          </div>
        </div>
      )}
    </>
  );
}
