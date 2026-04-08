import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8006';

export interface Expense {
  id: number;
  user_id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

export interface ExpenseStats {
  today: number;
  week: number;
  month: number;
  largest: number;
  since_budget: number;
  by_category: Record<string, number>;
}

export const addExpense = async (data: {
  user_id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}): Promise<Expense> => {
  try {
    const response = await axios.post<Expense>(
      `${API_BASE_URL}/api/expenses/add`,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to add expense');
    }
    throw error;
  }
};

export const getExpenses = async (
  user_id: string,
  start_date?: string,
  end_date?: string
): Promise<Expense[]> => {
  try {
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    
    const response = await axios.get(
      `${API_BASE_URL}/api/expenses/list/${user_id}?${params.toString()}`
    );
    return response.data.expenses;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to get expenses');
    }
    throw error;
  }
};

export const getExpenseStats = async (user_id: string): Promise<ExpenseStats> => {
  try {
    const response = await axios.get<ExpenseStats>(
      `${API_BASE_URL}/api/expenses/stats/${user_id}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to get stats');
    }
    throw error;
  }
};

export const setBudget = async (data: {
  user_id: string;
  amount: number;
  period: string;
}): Promise<any> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/budget/set`,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to set budget');
    }
    throw error;
  }
};

export const getBudget = async (user_id: string, period: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/budget/get/${user_id}/${period}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to get budget');
    }
    throw error;
  }
};
