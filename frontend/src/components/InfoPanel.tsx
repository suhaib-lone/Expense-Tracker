import React from 'react';
import { FileQuestion, FileText, Clock } from 'lucide-react';

const InfoPanel: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-blue-800 mb-4">How It Works</h2>
      
      <div className="space-y-4">
        <div className="flex">
          <div className="flex-shrink-0 mt-1">
            <FileQuestion className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-md font-medium text-blue-700">What is Prophet?</h3>
            <p className="mt-1 text-sm text-gray-600">
              Prophet is an open-source forecasting tool developed by Facebook that makes it easy to make high-quality 
              predictions for time series data. It works best with time series that have strong seasonal effects and 
              several seasons of historical data.
            </p>
          </div>
        </div>
        
        <div className="flex">
          <div className="flex-shrink-0 mt-1">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-md font-medium text-blue-700">CSV File Format</h3>
            <p className="mt-1 text-sm text-gray-600">
              Your CSV file should include at least these columns:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-gray-600 ml-2">
              <li><strong>Date</strong>: The timestamp for each data point (YYYY-MM-DD format)</li>
              <li><strong>Amount</strong>: The numeric value you want to forecast</li>
            </ul>
          </div>
        </div>
        
        <div className="flex">
          <div className="flex-shrink-0 mt-1">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-md font-medium text-blue-700">Processing Time</h3>
            <p className="mt-1 text-sm text-gray-600">
              Forecast generation usually takes a few seconds, depending on the size of your dataset. 
              The model analyzes patterns in your historical data to make accurate future predictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;