/**
 * Home/Landing Page
 * Public page with links to Signup/Signin
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Zap, Sparkles, Wallet, BarChart3, Shield, Rocket, ChevronRight } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-400 to-cyan-400 p-2 rounded-xl">
              <Wallet className="w-7 h-7 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ExpenseAI</h1>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Prophet Powered
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              to="/signin"
              className="px-5 py-2.5 text-sm font-semibold text-white hover:text-emerald-400 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2.5 text-sm font-bold text-slate-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-lg shadow-emerald-500/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero Content */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-emerald-400 text-sm font-medium mb-6 border border-white/20">
              <Sparkles className="w-4 h-4" />
              AI-Powered Financial Intelligence
            </div>
            
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Track Expenses.<br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Predict Your Future.
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Advanced machine learning forecasting meets smart budget management. 
              Let Prophet AI distribute your budget intelligently across categories.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                to="/signup"
                className="group px-8 py-4 text-lg font-bold text-slate-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                Start Free Today
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/signin"
                className="px-8 py-4 text-lg font-bold text-white bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-2"
              >
                Sign In
                <Rocket className="w-5 h-5" />
              </Link>
            </div>

            <p className="text-sm text-slate-400">
              No credit card required • Free forever • Setup in 2 minutes
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Prophet AI Forecasting
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Leverage cutting-edge Prophet ML to predict future expenses with remarkable accuracy. See trends before they happen.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="bg-gradient-to-br from-violet-500 to-purple-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Smart Budget Distribution
              </h3>
              <p className="text-slate-300 leading-relaxed">
                AI automatically allocates your budget across categories based on historical patterns and intelligent forecasting.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Secure & Private
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Bank-grade encryption protects your financial data. Your information stays yours, always private and secure.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Daily Expense Tracking
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Track every expense effortlessly. Categorize, analyze, and understand your spending patterns with beautiful visualizations.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="bg-gradient-to-br from-pink-500 to-rose-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-pink-500/30 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Real-time Insights
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Get instant insights into today's spending, weekly trends, and monthly patterns. Stay informed, stay in control.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="bg-gradient-to-br from-amber-500 to-yellow-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Lightning Fast
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Upload CSV data, get predictions instantly. Clean interface, powerful ML, seamless experience from start to finish.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-20 text-center">
            <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 backdrop-blur-lg rounded-3xl p-12 border border-white/20">
              <h3 className="text-4xl font-bold text-white mb-4">
                Ready to Master Your Finances?
              </h3>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Join thousands who trust ExpenseAI to make smarter financial decisions every day.
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold text-slate-900 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all shadow-2xl shadow-emerald-500/30"
              >
                Get Started Free
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/5 backdrop-blur-sm border-t border-white/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-emerald-400 to-cyan-400 p-1.5 rounded-lg">
                <Wallet className="w-5 h-5 text-slate-900" />
              </div>
              <span className="text-white font-bold">ExpenseAI</span>
            </div>
            <p className="text-slate-400 text-sm">
              © 2025 ExpenseAI. Powered by Prophet ML. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
