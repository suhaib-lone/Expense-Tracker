import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8006';

interface BudgetRequest {
  user_id: string;
  budget_amount: number;
  period: string;
  use_forecast?: boolean;
  preferences?: {
    savings_percent?: number;
    min_reserve?: number;
  };
}

interface CategoryAllocation {
  category: string;
  amount: number;
  percentage: number;
  reason: string;
}

interface BudgetResponse {
  budget_amount: number;
  period: string;
  allocations: CategoryAllocation[];
}

export const distributeBudget = async (request: BudgetRequest): Promise<BudgetResponse> => {
  try {
    const response = await axios.post<BudgetResponse>(
      `${API_BASE_URL}/api/budget/distribute`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.detail?.message || 'Failed to distribute budget');
    }
    throw error;
  }
};
