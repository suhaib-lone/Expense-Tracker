import { Prediction } from '../types';

/**
 * Converts prediction data to CSV format and triggers a download
 */
export const downloadCSV = (predictions: Prediction[], filename = 'predictions.csv'): void => {
  // Create CSV headers
  const headers = ['Date', 'Predicted Value'];
  
  // Convert predictions to CSV rows
  const rows = predictions.map(prediction => [
    prediction.ds,
    prediction.yhat.toString()
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create downloadable blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Validates if a file is a CSV by checking the extension
 */
export const isValidCSV = (file: File): boolean => {
  return file.name.endsWith('.csv') || file.type === 'text/csv';
};