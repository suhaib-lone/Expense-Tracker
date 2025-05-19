import React from 'react';
import { Download, Info } from 'lucide-react';
import { Prediction } from '../types';
import { downloadCSV } from '../utils/csv';
import PredictionChart from './PredictionChart';

interface ResultsPanelProps {
  predictions: Prediction[];
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ predictions }) => {
  if (!predictions.length) return null;

  // Get the first few and last few predictions for display
  const predictionsToDisplay = predictions
  const firstFew = predictions.slice(0, 3);
  const lastFew = predictions.slice(-3);
  
  // Calculate some basic stats
  const values = predictions.map(p => p.yhat);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  const handleDownload = () => {
    downloadCSV(predictions);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Forecast Results</h2>
          <p className="text-gray-600 mt-1">
            {predictions.length} data points predicted
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="mt-3 md:mt-0 flex items-center px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
        >
          <Download size={16} className="mr-2" />
          Download CSV
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="text-sm font-medium text-blue-600">Average Value</p>
          <p className="text-2xl font-bold text-blue-800">{avg.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <p className="text-sm font-medium text-green-600">Maximum Value</p>
          <p className="text-2xl font-bold text-green-800">{max.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <p className="text-sm font-medium text-purple-600">Minimum Value</p>
          <p className="text-2xl font-bold text-purple-800">{min.toFixed(2)}</p>
        </div>
      </div>

      <PredictionChart predictions={predictions} />
      
      <div className="bg-white rounded-xl shadow-md p-6 mt-6">
        <div className="flex items-center mb-4">
          <Info size={18} className="text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Sample Prediction Data</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predicted Value
                </th>
              </tr>
            </thead>
            {/* <tbody className="bg-white divide-y divide-gray-200">
              {firstFew.map((prediction, index) => (
                <tr key={`first-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {prediction.ds}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {prediction.yhat.toFixed(2)}
                  </td>
                </tr>
              ))}
              {predictions.length > 6 && (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                    • • •
                  </td>
                </tr>
              )}
              {lastFew.map((prediction, index) => (
                <tr key={`last-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {prediction.ds}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {prediction.yhat.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody> */}
            <tbody className="bg-white divide-y divide-gray-200">
              {predictionsToDisplay.map((prediction, index) => (
                <tr key={`last-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {prediction.ds}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {prediction.yhat.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;