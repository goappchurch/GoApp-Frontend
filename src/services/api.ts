// API Configuration and Service Layer for GoAppChurch

const API_BASE_URL = __DEV__
  ? 'http://192.168.31.47:3001/api/v1'
  : 'https://your-production-api.com/api/v1';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'speaker' | 'assistant';
}

export interface Event {
  id: string;
  title: string;
  eventType: string;
  startDatetime: string;
  endDatetime: string;
  timezone: string;
  status: 'draft' | 'confirmed' | 'cancelled' | 'completed';
  venueName?: string;
  venueAddress?: string;
  speakingTopic?: string;
  expectedAudience?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'speaker' | 'assistant';
  inviteCode?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  session?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

export interface CreateEventRequest {
  title: string;
  eventType: string;
  startDatetime: string;
  endDatetime: string;
  timezone: string;
  venueName?: string;
  venueAddress?: string;
  speakingTopic?: string;
  expectedAudience?: number;
}

class ApiService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Authentication Methods
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.session?.accessToken) {
      this.setAuthToken(response.session.accessToken);
    }

    return response;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearAuthToken();
    }
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile');
  }

  // Events Methods
  async getEvents(params?: {
    page?: number;
    limit?: number;
    status?: string;
    eventType?: string;
  }): Promise<{
    events: Event[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const query = searchParams.toString();
    const endpoint = `/events${query ? `?${query}` : ''}`;

    return this.request(endpoint);
  }

  async getEvent(id: string): Promise<{ event: Event }> {
    return this.request<{ event: Event }>(`/events/${id}`);
  }

  async createEvent(eventData: CreateEventRequest): Promise<{ event: Event }> {
    return this.request<{ event: Event }>('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(id: string, eventData: Partial<CreateEventRequest>): Promise<{ event: Event }> {
    return this.request<{ event: Event }>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async deleteEvent(id: string): Promise<void> {
    await this.request(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  async updateEventStatus(id: string, status: string): Promise<{ event: Event }> {
    return this.request<{ event: Event }>(`/events/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getUpcomingEvents(limit?: number): Promise<{ events: Event[] }> {
    const endpoint = `/events/upcoming${limit ? `?limit=${limit}` : ''}`;
    return this.request<{ events: Event[] }>(endpoint);
  }
}

// Create and export the API service instance
export const apiService = new ApiService(API_BASE_URL);

// Helper function to handle API errors
export const handleApiError = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default apiService;