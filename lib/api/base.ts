import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { createClient } from "@/lib/supabase/client";

/**
 * Base API response interface
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

/**
 * API Error response interface
 */
export interface ApiErrorResponse {
  message?: string;
  error?: string;
  details?: any;
}

/**
 * Base API service class that provides common HTTP methods and error handling
 */
export abstract class BaseApiService {
  protected axiosInstance: AxiosInstance;
  protected supabase = createClient();

  constructor(baseURL?: string) {
    this.axiosInstance = axios.create({
      baseURL: baseURL || "/api",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const {
          data: { session },
        } = await this.supabase.auth.getSession();
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        return Promise.reject(
          this.handleError(error as AxiosError<ApiErrorResponse>),
        );
      },
    );
  }

  /**
   * Handle API errors consistently
   */
  protected handleError(error: AxiosError<ApiErrorResponse>): ApiResponse {
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        error:
          error.response.data?.message ||
          `HTTP ${error.response.status}: ${error.response.statusText}`,
      };
    } else if (error.request) {
      // Network error
      return {
        success: false,
        error: "Network error: Please check your connection",
      };
    } else {
      // Other error
      return {
        success: false,
        error: error.message || "An unexpected error occurred",
      };
    }
  }

  /**
   * Generic GET request
   */
  protected async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get<T>(url, { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }

  /**
   * Generic POST request
   */
  protected async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<T>(url, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }

  /**
   * Generic PUT request
   */
  protected async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<T>(url, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }

  /**
   * Generic DELETE request
   */
  protected async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<T>(url);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }

  /**
   * Generic PATCH request
   */
  protected async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch<T>(url, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return error as ApiResponse<T>;
    }
  }
}
