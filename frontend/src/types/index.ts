// API response types
export interface Prediction {
  ds: string;  // date string
  yhat: number; // predicted value
}

export interface PredictionResponse {
  predictions: Prediction[];
}

// App state types
export type AppStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface AppState {
  status: AppStatus;
  predictions: Prediction[];
  error: string | null;
}