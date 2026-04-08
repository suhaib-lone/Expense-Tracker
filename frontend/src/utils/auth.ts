/**
 * Authentication utility functions
 * Handles token storage, retrieval, and auth API calls
 * 
 * TODO: Update API_BASE_URL if backend is deployed elsewhere
 * TODO: If backend sets httpOnly cookies, remove localStorage logic
 */

import axios, { AxiosError } from 'axios';

// TODO: Change this to match your deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8006';

const TOKEN_KEY = 'expense_token';
const USER_KEY = 'expense_user';

/**
 * Auth API endpoints
 */
const AUTH_API = {
  signup: `${API_BASE_URL}/api/auth/signup`,
  login: `${API_BASE_URL}/api/auth/login`,
};

// Interfaces matching backend contract
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  [key: string]: any;
}

export interface AuthResponse {
  user: AuthUser;
  token?: string; // Optional if backend uses httpOnly cookies
}

export interface ApiError {
  message: string;
  errors?: Record<string, string>;
}

/**
 * Store auth token in sessionStorage (tab-isolated)
 * TODO: If using httpOnly cookies, remove this function
 */
export const setAuthToken = (token: string): void => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

/**
 * Store user data in sessionStorage (tab-isolated)
 */
export const setUserData = (user: AuthUser): void => {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Get user data from sessionStorage
 */
export const getUserData = (): AuthUser | null => {
  const userData = sessionStorage.getItem(USER_KEY);
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch (e) {
      return null;
    }
  }
  return null;
};

/**
 * Retrieve auth token from sessionStorage
 * TODO: If using httpOnly cookies, modify to check cookie existence
 */
export const getAuthToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY);
};

/**
 * Remove auth token (logout)
 */
export const removeAuthToken = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

/**
 * Signup user - POST /api/auth/signup
 * Expected response: 201 with { user, token }
 * Expected error: 400 with { message } or { errors: { field: "error" } }
 */
export const signup = async (data: SignupRequest): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(AUTH_API.signup, data, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable if backend uses cookies
    });

    // If token is returned in response, store it
    if (response.data.token) {
      setAuthToken(response.data.token);
    }

    // Store user data
    if (response.data.user) {
      setUserData(response.data.user);
    }

    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Login user - POST /api/auth/login
 * Expected response: 200 with { user, token }
 * Expected error: 401/400 with { message }
 */
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  try {
    const response = await axios.post<AuthResponse>(AUTH_API.login, data, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable if backend uses cookies
    });

    // If token is returned in response, store it
    if (response.data.token) {
      setAuthToken(response.data.token);
    }

    // Store user data
    if (response.data.user) {
      setUserData(response.data.user);
    }

    return response.data;
  } catch (error) {
    throw handleAuthError(error);
  }
};

/**
 * Logout user
 * TODO: If backend has logout endpoint, call it here
 */
export const logout = (): void => {
  removeAuthToken();
  // TODO: Optionally call backend logout endpoint to invalidate session
  // await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true });
};

/**
 * Get authorization header for authenticated requests
 */
export const getAuthHeader = (): Record<string, string> => {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

/**
 * Handle auth API errors and format them for display
 */
const handleAuthError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    
    if (axiosError.response?.data) {
      return axiosError.response.data;
    }
    
    if (axiosError.message === 'Network Error') {
      return {
        message: 'Unable to connect to the server. Please check your connection and try again.',
      };
    }
    
    return {
      message: axiosError.message || 'An unexpected error occurred',
    };
  }

  return {
    message: 'An unexpected error occurred. Please try again.',
  };
};

/**
 * Helper to get field-specific error from API response
 */
export const getFieldError = (apiError: ApiError | null, field: string): string | undefined => {
  return apiError?.errors?.[field];
};
