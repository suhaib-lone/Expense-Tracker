import axios from 'axios';
import { PredictionResponse } from '../types';

// Update this URL to match your FastAPI backend:
const API_URL=import.meta.env.VITE_API_URL;

/**
 * Uploads a CSV file to the forecasting API and returns predictions
 */
export const uploadCSV = async (file: File, userId?: string): Promise<PredictionResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  // Build URL with user_id query parameter if provided
  let url = `${API_URL}/upload_csv`;
  if (userId) {
    url += `?user_id=${userId}`;
  }

  try {
    const response = await axios.post<PredictionResponse>(
      url,
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

// Prophet ML Prediction & Insights APIs

export interface ForecastDay {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

export interface ForecastResponse {
  success: boolean;
  forecast: ForecastDay[];
  summary: {
    total_predicted: number;
    daily_average: number;
    period_days: number;
    confidence: string;
  };
  message?: string;
}

export interface CategoryForecast {
  predicted_total: number;
  daily_average: number;
  trend: 'increasing' | 'decreasing';
}

export interface CategoryForecastResponse {
  success: boolean;
  forecasts: Record<string, CategoryForecast>;
  period_days: number;
  message?: string;
}

export interface Anomaly {
  date: string;
  amount: number;
  deviation: number;
  severity: 'high' | 'medium';
}

export interface AnomaliesResponse {
  success: boolean;
  anomalies: Anomaly[];
  baseline: {
    average_daily: number;
    threshold: number;
  };
  message?: string;
}

export interface Insight {
  type: string;
  message: string;
  tip: string;
  savings_potential?: number;
}

export interface TrendsResponse {
  success: boolean;
  insights: Insight[];
  statistics: {
    total_expenses: number;
    average_transaction: number;
    days_tracked: number;
    total_savings_potential?: number;
  };
  message?: string;
}

export const getSpendingForecast = async (
  userId: string,
  days: number = 30
): Promise<ForecastResponse> => {
  try {
    const response = await axios.get<ForecastResponse>(
      `${API_URL}/api/forecast/spending/${userId}?days=${days}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to get forecast');
    }
    throw error;
  }
};

export const getCategoryForecast = async (
  userId: string,
  days: number = 30
): Promise<CategoryForecastResponse> => {
  try {
    const response = await axios.get<CategoryForecastResponse>(
      `${API_URL}/api/forecast/category/${userId}?days=${days}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to get category forecast');
    }
    throw error;
  }
};

export const getAnomalies = async (userId: string): Promise<AnomaliesResponse> => {
  try {
    const response = await axios.get<AnomaliesResponse>(
      `${API_URL}/api/insights/anomalies/${userId}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to detect anomalies');
    }
    throw error;
  }
};

export const getTrends = async (userId: string): Promise<TrendsResponse> => {
  try {
    const response = await axios.get<TrendsResponse>(
      `${API_URL}/api/insights/trends/${userId}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to analyze trends');
    }
    throw error;
  }
};
