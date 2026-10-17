import axios from 'axios';

export const API_BASE_URL = 'https://petlove.b.goit.study/api';
export const AUTH_TOKEN_KEY = 'petlove-auth-token';

export type NoticeCategory = 'found' | 'free' | 'lost' | 'sell';
export type NoticeSex = 'female' | 'male' | 'multiple' | 'unknown';
export type NoticeSpecies =
  | 'dog'
  | 'cat'
  | 'monkey'
  | 'bird'
  | 'snake'
  | 'turtle'
  | 'lizard'
  | 'frog'
  | 'fish'
  | 'ants'
  | 'bees'
  | 'butterfly'
  | 'spider'
  | 'scorpion';

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest extends SignInRequest {
  name: string;
}

export interface AuthResponse {
  name: string;
  email: string;
  token: string;
}

export interface NoticeLocation {
  _id: string;
  stateEn: string;
  cityEn: string;
}

export interface Notice {
  _id: string;
  species: NoticeSpecies | string;
  category: NoticeCategory | string;
  price?: number;
  title: string;
  name: string;
  birthday: string;
  comment: string;
  sex: NoticeSex | string;
  location: string | NoticeLocation;
  imageUrl?: string;
  imgURL?: string;
  imgUrl?: string;
  popularity: number;
  user?: string | { _id: string; email?: string; phone?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface NoticesResponse {
  results: Notice[];
  totalPages: number;
  page: number;
  perPage: number;
}

export interface NewsItem {
  _id: string;
  imgUrl: string;
  title: string;
  text: string;
  date: string;
  url: string;
}

export interface NewsResponse {
  results: NewsItem[];
  totalPages: number;
  page: number;
  perPage: number;
}

export interface Friend {
  _id: string;
  title: string;
  url: string;
  addressUrl: string | null;
  address: string | null;
  imageUrl: string;
  workDays: Array<{ _id: string; isOpen: boolean; from?: string; to?: string }> | null;
  phone: string | null;
  email: string | null;
}

export interface CityLocation {
  _id: string;
  stateEn: string;
  cityEn: string;
  countyEn?: string;
}

export interface UserPet {
  _id: string;
  name: string;
  title: string;
  imgURL: string;
  species: string;
  birthday: string;
  sex: string;
}

export interface CurrentUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  token?: string;
  noticesFavorites?: Notice[];
  noticesViewed?: Notice[];
  pets?: UserPet[];
}

export interface EditUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface AddPetRequest {
  name: string;
  title: string;
  imgURL: string;
  species: NoticeSpecies;
  birthday: string;
  sex: NoticeSex;
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  onDownloadProgress: event => {
    if (event.total) window.dispatchEvent(new CustomEvent('petlove:download-progress', { detail: event.loaded / event.total * 100 }));
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = localStorage.getItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      if (hadToken) window.dispatchEvent(new Event('petlove:session-expired'));
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  async signIn(payload: SignInRequest) {
    const { data } = await client.post<AuthResponse>('/users/signin', payload);
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    return data;
  },
  async signUp(payload: SignUpRequest) {
    const { data } = await client.post<AuthResponse>('/users/signup', payload);
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    return data;
  },
  async signOut() {
    try {
      await client.post('/users/signout');
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  },
};

export const usersApi = {
  current: () => client.get<CurrentUser>('/users/current').then(({ data }) => data),
  full: () => client.get<CurrentUser>('/users/current/full').then(({ data }) => data),
  edit: (payload: EditUserRequest) =>
    client.patch<CurrentUser>('/users/current/edit', payload).then(({ data }) => data),
  addPet: (payload: AddPetRequest) =>
    client.post<CurrentUser>('/users/current/pets/add', payload).then(({ data }) => data),
  removePet: (id: string) =>
    client.delete<CurrentUser>(`/users/current/pets/remove/${id}`).then(({ data }) => data),
};

export interface NoticeQuery {
  keyword?: string;
  category?: string;
  species?: string;
  locationId?: string;
  sex?: string;
  byDate?: boolean;
  byPrice?: boolean;
  byPopularity?: boolean;
  page?: number;
  limit?: number;
}

export const noticesApi = {
  list: (params?: NoticeQuery) => client.get<NoticesResponse>('/notices', { params }).then(({ data }) => data),
  byId: (id: string) => client.get<Notice>(`/notices/${id}`).then(({ data }) => data),
  categories: () => client.get<NoticeCategory[]>('/notices/categories').then(({ data }) => data),
  sex: () => client.get<NoticeSex[]>('/notices/sex').then(({ data }) => data),
  species: () => client.get<NoticeSpecies[]>('/notices/species').then(({ data }) => data),
  addFavorite: (id: string) =>
    client.post<string[]>(`/notices/favorites/add/${id}`).then(({ data }) => data),
  removeFavorite: (id: string) =>
    client.delete<string[]>(`/notices/favorites/remove/${id}`).then(({ data }) => data),
};

export const citiesApi = {
  search: (keyword: string) =>
    client.get<CityLocation[]>('/cities/', { params: { keyword } }).then(({ data }) => data),
  locations: () => client.get<CityLocation[]>('/cities/locations').then(({ data }) => data),
};

export const friendsApi = {
  list: () => client.get<Friend[]>('/friends/').then(({ data }) => data),
};

export const newsApi = {
  list: (params?: { keyword?: string; page?: number; limit?: number }) =>
    client.get<NewsResponse>('/news', { params }).then(({ data }) => data),
};

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return error.config?.url === '/users/signin' ? 'Email or password is invalid.' : 'Your session has expired. Please log in again.';
    if (status === 409 && error.config?.url === '/users/signup') return 'This email is already registered.';
    if (status === 400) return 'Please check the entered data.';
    if (error.response?.data?.message && typeof error.response.data.message === 'string') {
      return error.response.data.message;
    }
  }
  return fallback;
}
