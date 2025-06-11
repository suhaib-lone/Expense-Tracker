import axios from 'axios';
import { PredictionResponse } from '../types';

// Update this URL to match your FastAPI backend:
const API_URL=import.meta.env.VITE_API_URL;

/**
 * Uploads a CSV file to the forecasting API and returns predictions
 */
export const uploadCSV = async (file: File): Promise<PredictionResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<PredictionResponse>(
      `${API_URL}/upload_csv`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || 'Failed to process file');
    }
    throw new Error('Failed to connect to the forecasting service');
  }
};

/**
 * Validates the CSV file format
 */
export const validateCSV = (file: File): boolean => {
  return file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
};