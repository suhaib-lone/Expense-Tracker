/**
 * Dashboard Page
 * Protected page showing user's expense tracking interface
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Zap, Upload, Clock, BarChart3 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import SmartBot from '../components/SmartBot';
import FileUploader from '../components/FileUploader';
import ResultsPanel from '../components/ResultsPanel';
import InfoPanel from '../components/InfoPanel';
import { uploadCSV } from '../api/forecastApi';
import { getAuthToken, getUserData } from '../utils/auth';
import { Prediction, AppStatus } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AppStatus>('idle');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get current user data
  const userData = getUserData();
  const userId = userData?.id;

  // Check if user is authenticated
  React.useEffect(() => {
    if (!getAuthToken()) {
      navigate('/signin');
    }
  }, [navigate]);

  const handleFileUpload = async (file: File) => {
    setStatus('uploading');
    setError(null);
    
    try {
      // Pass userId to uploadCSV so the model is saved for this user
      const response = await uploadCSV(file, userId);
      setPredictions(response.predictions);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error uploading file:', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-2xl shadow-lg shadow-blue-500/30">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Time Series Forecasting
                </h1>
                <p className="text-slate-600 flex items-center gap-2 mt-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Powered by Prophet ML
                </p>
              </div>
            </div>
            <p className="text-lg text-slate-600 ml-16">
              Upload your CSV data and let AI predict future trends with precision
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-2xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-violet-500 to-purple-500 p-4 rounded-xl shadow-lg shadow-purple-500/30">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Quick Upload</p>
                  <p className="text-2xl font-bold text-slate-800">CSV Files</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-2xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-4 rounded-xl shadow-lg shadow-emerald-500/30">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Processing</p>
                  <p className="text-2xl font-bold text-slate-800">Real-time</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-2xl transition-shadow">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-xl shadow-lg shadow-orange-500/30">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Accuracy</p>
                  <p className="text-2xl font-bold text-slate-800">High</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Info Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <InfoPanel />
              </div>
            </div>
            
            {/* Upload & Results Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Section */}
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <FileUploader 
                  onFileSelect={handleFileUpload} 
                  isUploading={status === 'uploading'} 
                />
              </div>
              
              {/* Error Display */}
              {status === 'error' && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-2xl p-6 shadow-xl">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="bg-red-500 p-2 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-red-800 mb-1">
                        Error Processing File
                      </h3>
                      <p className="text-red-700">
                        {error || 'Please check your file format and try again.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Results Display */}
              {status === 'success' && (
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  <ResultsPanel predictions={predictions} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Smart Bot Assistant */}
      <SmartBot />
    </div>
  );
};
