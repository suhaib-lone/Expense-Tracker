import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import FileUploader from './components/FileUploader';
import ResultsPanel from './components/ResultsPanel';
import InfoPanel from './components/InfoPanel';
import { uploadCSV } from './api/forecastApi';
import { Prediction, AppStatus } from './types';

function App() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setStatus('uploading');
    setError(null);
    
    try {
      const response = await uploadCSV(file);
      setPredictions(response.predictions);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error uploading file:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              Time Series Forecasting
            </h1>
            <p className="mt-3 text-lg text-gray-600">
              Upload your data to generate accurate predictions using Prophet
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <InfoPanel />
            </div>
            
            <div className="md:col-span-2">
              <FileUploader 
                onFileSelect={handleFileUpload} 
                isUploading={status === 'uploading'} 
              />
              
              {status === 'error' && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Error processing your file
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        {error || 'Please check your file format and try again.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {status === 'success' && <ResultsPanel predictions={predictions} />}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;