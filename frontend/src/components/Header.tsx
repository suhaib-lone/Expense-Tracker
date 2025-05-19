import React from 'react';
import { TrendingUp } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-900 text-white py-6 px-4 shadow-md">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-4 md:mb-0">
          <TrendingUp size={32} className="text-teal-400 mr-3" />
          <div>
            <h1 className="text-2xl font-bold">Prophet Forecaster</h1>
            <p className="text-blue-200 text-sm">Time Series Prediction Tool</p>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <a 
            href="https://facebook.github.io/prophet/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm bg-blue-700 hover:bg-blue-600 rounded-md transition-colors duration-200"
          >
            About Prophet
          </a>
          <a 
            href="https://github.com/facebook/prophet" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-md transition-colors duration-200"
          >
            Documentation
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;