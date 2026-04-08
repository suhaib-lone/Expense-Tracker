import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Download, Calendar, BarChart3, Zap, AlertCircle, Lightbulb, TrendingDown, Bell, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import SmartBot from '../components/SmartBot';
import { getExpenses, getExpenseStats } from '../api/expenseApi';
import { getSpendingForecast, getCategoryForecast, getAnomalies, getTrends } from '../api/forecastApi';

export default function Analytics() {
  const userId = sessionStorage.getItem('expense_user') ? JSON.parse(sessionStorage.getItem('expense_user')!).id || '1' : '1';
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New prediction states
  const [forecast, setForecast] = useState<any>(null);
  const [categoryForecast, setCategoryForecast] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [forecastDays, setForecastDays] = useState(30);
  
  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#84cc16'];

  useEffect(() => {
    loadAnalyticsData();
    loadPredictions();
  }, [forecastDays]);
  
  useEffect(() => {
    // Update unread count when insights change
    setUnreadCount(insights.length);
  }, [insights]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [expensesData, statsData] = await Promise.all([
        getExpenses(userId),
        getExpenseStats(userId)
      ]);

      setExpenses(expensesData);
      setStats(statsData);

      // Process category data for pie chart
      if (statsData.by_category) {
        const catData = Object.entries(statsData.by_category).map(([name, value]) => ({
          name,
          value: value as number
        }));
        setCategoryData(catData);
      }

      // Process daily spending for last 7 days
      const last7Days = getLast7DaysData(expensesData);
      setDailyData(last7Days);

      // Process monthly trend for last 6 months
      const last6Months = getLast6MonthsData(expensesData);
      setMonthlyTrend(last6Months);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    try {
      const [forecastData, catForecastData, anomalyData, trendData] = await Promise.all([
        getSpendingForecast(userId, forecastDays).catch(() => null),
        getCategoryForecast(userId, forecastDays).catch(() => null),
        getAnomalies(userId).catch(() => null),
        getTrends(userId).catch(() => null)
      ]);

      if (forecastData?.success) {
        setForecast(forecastData);
      }
      if (catForecastData?.success) {
        setCategoryForecast(catForecastData);
      }
      if (anomalyData?.success) {
        setAnomalies(anomalyData.anomalies || []);
      }
      if (trendData?.success) {
        setInsights(trendData.insights || []);
      }
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }
  };

  const getLast7DaysData = (expenses: any[]) => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayExpenses = expenses.filter(exp => exp.date === dateStr);
      const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        amount: total
      });
    }
    return days;
  };

  const getLast6MonthsData = (expenses: any[]) => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      
      const monthExpenses = expenses.filter(exp => exp.date.startsWith(monthStr));
      const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: total
      });
    }
    return months;
  };

  const exportToCSV = () => {
    if (expenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    const headers = ['Date', 'Category', 'Amount', 'Description'];
    const csvData = expenses.map(exp => [
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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-violet-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 font-medium">Loading analytics...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3.5 rounded-2xl shadow-lg shadow-blue-500/30">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Analytics & Reports
                </h1>
                <p className="text-slate-600 mt-1">Visualize your spending patterns</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative px-4 py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-lg flex items-center gap-2"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={exportToCSV}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-violet-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-violet-600" />
                </div>
                <p className="text-sm font-medium text-slate-600">Total Expenses</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">₹{(stats?.month || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">This month</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-600">Daily Average</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">₹{((stats?.month || 0) / 30).toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">Per day</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-slate-600">This Week</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">₹{(stats?.week || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">Last 7 days</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-sm font-medium text-slate-600">Largest</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">₹{(stats?.largest || 0).toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">Single expense</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Category Distribution - Pie Chart */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Spending by Category</h3>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `₹${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  No data available
                </div>
              )}
            </div>

            {/* Last 7 Days - Bar Chart */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Last 7 Days</h3>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => `₹${value.toFixed(2)}`} />
                    <Bar dataKey="amount" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Monthly Trend - Line Chart */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">6-Month Trend</h3>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => `₹${value.toFixed(2)}`} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 6 }}
                    activeDot={{ r: 8 }}
                    name="Spending"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-slate-500">
                No data available
              </div>
            )}
          </div>

          {/* 🔮 FUTURE SPENDING PREDICTION SECTION */}
          {forecast && forecast.success && (
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-8 shadow-2xl border-2 border-purple-300 mb-8 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-300/20 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-300/20 to-transparent rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-purple-500/50 animate-pulse">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                          🔮 Future Spending Prediction
                        </h3>
                      </div>
                      <p className="text-slate-600 font-medium mt-1">AI-powered forecast using Prophet ML</p>
                    </div>
                  </div>
                  <select
                    value={forecastDays}
                    onChange={(e) => setForecastDays(Number(e.target.value))}
                    className="px-5 py-3 bg-white border-2 border-purple-300 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-purple-500 hover:bg-purple-50 transition-all shadow-lg"
                  >
                    <option value={7}>Next 7 Days</option>
                    <option value={14}>Next 14 Days</option>
                    <option value={30}>Next Month</option>
                    <option value={60}>Next 2 Months</option>
                  </select>
                </div>

                {/* Enhanced Forecast Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-purple-200 hover:shadow-2xl hover:scale-105 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600">Expected Total</p>
                    </div>
                    <p className="text-4xl font-bold text-purple-600 mb-1">₹{forecast.summary.total_predicted.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">Next {forecastDays} days</p>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-600">
                        {forecast.summary.total_predicted > (stats?.month || 0) ? (
                          <span className="text-orange-600 font-semibold">⚠️ Higher than last month</span>
                        ) : (
                          <span className="text-green-600 font-semibold">✓ Lower than last month</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-indigo-200 hover:shadow-2xl hover:scale-105 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600">Daily Average</p>
                    </div>
                    <p className="text-4xl font-bold text-indigo-600 mb-1">₹{forecast.summary.daily_average.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">Per day estimate</p>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-600">
                        Tomorrow: <span className="font-bold text-indigo-700">₹{forecast.forecast[0]?.predicted.toFixed(2) || 0}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-emerald-200 hover:shadow-2xl hover:scale-105 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600">Confidence Level</p>
                    </div>
                    <p className="text-4xl font-bold text-emerald-600 mb-1 capitalize">{forecast.summary.confidence}</p>
                    <p className="text-sm text-slate-500">Prediction accuracy</p>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all"
                            style={{ width: forecast.summary.confidence === 'high' ? '90%' : forecast.summary.confidence === 'medium' ? '70%' : '50%' }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600">
                          {forecast.summary.confidence === 'high' ? '90%' : forecast.summary.confidence === 'medium' ? '70%' : '50%'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Forecast Chart */}
              {/* Enhanced Forecast Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-bold text-slate-900">📈 Daily Spending Forecast</h4>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-600 rounded"></div>
                      <span className="text-slate-600 font-medium">Predicted</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-200 rounded"></div>
                      <span className="text-slate-600 font-medium">Range</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={forecast.forecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any) => `₹${value.toFixed(2)}`}
                      contentStyle={{ backgroundColor: 'white', border: '2px solid #a78bfa', borderRadius: '12px' }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="upper" 
                      stackId="1"
                      stroke="#c4b5fd" 
                      fill="#c4b5fd" 
                      fillOpacity={0.3}
                      name="Upper Bound"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="predicted" 
                      stackId="2"
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      strokeWidth={3}
                      name="Predicted"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="lower" 
                      stackId="1"
                      stroke="#ddd6fe" 
                      fill="#ddd6fe" 
                      fillOpacity={0.3}
                      name="Lower Bound"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                
                {/* Quick Insights Below Chart */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <p className="text-xs text-slate-600 mb-1 font-medium">Peak Day</p>
                    <p className="text-lg font-bold text-purple-600">
                      ₹{Math.max(...forecast.forecast.map((f: any) => f.predicted)).toFixed(0)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-xs text-slate-600 mb-1 font-medium">Lowest Day</p>
                    <p className="text-lg font-bold text-indigo-600">
                      ₹{Math.min(...forecast.forecast.map((f: any) => f.predicted)).toFixed(0)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-xs text-slate-600 mb-1 font-medium">First Week</p>
                    <p className="text-lg font-bold text-emerald-600">
                      ₹{forecast.forecast.slice(0, 7).reduce((sum: number, f: any) => sum + f.predicted, 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-xs text-slate-600 mb-1 font-medium">Trend</p>
                    <p className="text-lg font-bold text-amber-600 flex items-center justify-center gap-1">
                      {forecast.forecast[forecast.forecast.length - 1]?.predicted > forecast.forecast[0]?.predicted ? (
                        <><TrendingUp className="w-4 h-4" /> Up</>
                      ) : (
                        <><TrendingDown className="w-4 h-4" /> Down</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category-wise Future Spending */}
          {categoryForecast && categoryForecast.success && Object.keys(categoryForecast.forecasts).length > 0 && (
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl p-8 shadow-2xl border-2 border-cyan-200 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2.5 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">📊 Category-wise Predictions</h3>
                  <p className="text-slate-600 text-sm">Future spending breakdown by category</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(categoryForecast.forecasts).map(([category, data]: [string, any]) => (
                  <div key={category} className="bg-white rounded-2xl p-6 border-2 border-cyan-200 hover:shadow-xl hover:scale-105 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-slate-900">{category}</h4>
                      {data.trend === 'increasing' ? (
                        <div className="p-2 bg-red-100 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-red-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TrendingDown className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 font-medium">Expected Total:</span>
                        <span className="font-bold text-cyan-600 text-lg">₹{data.predicted_total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                        <span className="text-sm text-slate-600 font-medium">Daily Average:</span>
                        <span className="font-semibold text-slate-700">₹{data.daily_average.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${data.trend === 'increasing' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {data.trend === 'increasing' ? '↑ Rising' : '↓ Falling'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Insights */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 shadow-2xl border-2 border-amber-200 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 rounded-xl">
                    <Lightbulb className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Smart Insights & Recommendations</h3>
                </div>
                {insights[0] && insights.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-600 mb-1">Potential Monthly Savings</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ₹{insights.reduce((sum: number, i: any) => sum + (i.savings_potential || 0), 0).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {insights.map((insight, index) => (
                  <div key={index} className="bg-white rounded-2xl p-6 border border-amber-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-bold text-slate-900 flex-1">{insight.message}</h4>
                      {insight.savings_potential && insight.savings_potential > 0 && (
                        <div className="ml-3 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-lg whitespace-nowrap">
                          Save ₹{insight.savings_potential.toFixed(0)}
                        </div>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed mb-3">{insight.tip}</p>
                    <div className="flex items-center justify-between">
                      <div className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg">
                        {insight.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anomalies Detection */}
          {anomalies.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-3xl p-8 shadow-2xl border-2 border-red-200 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-red-500 to-pink-500 p-2.5 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Unusual Spending Detected</h3>
              </div>

              <div className="space-y-4">
                {anomalies.map((anomaly, index) => (
                  <div key={index} className={`bg-white rounded-2xl p-6 border-2 ${anomaly.severity === 'high' ? 'border-red-300' : 'border-orange-300'} hover:shadow-lg transition-shadow`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-slate-900">₹{anomaly.amount.toFixed(2)}</p>
                        <p className="text-sm text-slate-600">{anomaly.date}</p>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-lg inline-block ${anomaly.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          <span className="text-sm font-bold">{anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 capitalize">{anomaly.severity} severity</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Notification Panel */}
      {showNotifications && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setShowNotifications(false)}
          />
          
          {/* Notification Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 shadow-lg z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Smart Insights</h2>
                  <p className="text-blue-100 text-sm mt-1">{insights.length} recommendations available</p>
                </div>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    setUnreadCount(0);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {insights.length === 0 ? (
                <div className="text-center py-16">
                  <Lightbulb className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">No insights available</p>
                  <p className="text-sm text-slate-500 mt-2">Add more expenses to get personalized recommendations</p>
                </div>
              ) : (
                insights.map((insight, index) => (
                  <div 
                    key={index}
                    className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        insight.type === 'weekend_spending' ? 'bg-purple-100' :
                        insight.type === 'best_shopping_day' ? 'bg-emerald-100' :
                        insight.type === 'category_optimization' ? 'bg-blue-100' :
                        insight.type === 'spending_momentum' ? 'bg-orange-100' :
                        insight.type === 'large_purchases' ? 'bg-red-100' :
                        insight.type === 'budget_reallocation' ? 'bg-cyan-100' :
                        'bg-amber-100'
                      }`}>
                        {insight.type === 'weekend_spending' ? <Calendar className="w-6 h-6 text-purple-600" /> :
                         insight.type === 'best_shopping_day' ? <TrendingDown className="w-6 h-6 text-emerald-600" /> :
                         insight.type === 'category_optimization' ? <BarChart3 className="w-6 h-6 text-blue-600" /> :
                         insight.type === 'spending_momentum' ? <TrendingUp className="w-6 h-6 text-orange-600" /> :
                         insight.type === 'large_purchases' ? <AlertCircle className="w-6 h-6 text-red-600" /> :
                         insight.type === 'budget_reallocation' ? <DollarSign className="w-6 h-6 text-cyan-600" /> :
                         <Lightbulb className="w-6 h-6 text-amber-600" />}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                          {insight.title}
                        </h3>
                        <p className="text-slate-600 text-sm mb-3 leading-relaxed">
                          {insight.message}
                        </p>
                        
                        {insight.savings_potential && insight.savings_potential > 0 && (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-3">
                            <Zap className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-semibold text-emerald-700">
                              Potential Savings: ₹{insight.savings_potential.toFixed(2)}
                            </span>
                          </div>
                        )}
                        
                        {insight.category && (
                          <div className="mt-3">
                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                              {insight.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {insights.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 border-2 border-emerald-200 rounded-2xl p-6 mt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-6 h-6 text-emerald-600" />
                    <h3 className="text-lg font-bold text-slate-900">Total Monthly Savings Potential</h3>
                  </div>
                  <p className="text-3xl font-bold text-emerald-600">
                    ₹{insights.reduce((sum, insight) => sum + (insight.savings_potential || 0), 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-600 mt-2">Follow these recommendations to save more</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Smart Bot Assistant */}
      <SmartBot stats={stats} expenses={expenses} />
    </div>
  );
}
