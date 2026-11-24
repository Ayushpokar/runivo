import type {
  AuthResponse,
  BookmarkItem,
  Difficulty,
  NoteItem,
  ProblemDetail,
  ProblemListItem,
  PublicUser,
  SubmissionItem,
  SupportedLanguage,
} from '../types/api';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

interface ApiSuccess<T> {
  status: 'success';
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiErrorPayload {
  status: 'error';
  message: string;
  errors?: Array<{ path: string; message: string }>;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiSuccess<T>> {
  const token = localStorage.getItem('runivo_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const payload = (await response.json()) as ApiSuccess<T> | ApiErrorPayload;

  if (!response.ok || payload.status === 'error') {
    const errPayload = payload as ApiErrorPayload;
    const details = errPayload.errors
      ? ': ' + errPayload.errors.map((e) => `${e.path} (${e.message})`).join(', ')
      : '';
    throw new Error((errPayload.message || 'Request failed') + details);
  }

  return payload;
}

export const api = {
  // Auth
  async register(data: {
    username: string;
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getMe(): Promise<PublicUser> {
    const res = await request<PublicUser>('/auth/me');
    return res.data;
  },

  // Problems
  async listProblems(params?: {
    difficulty?: Difficulty | '';
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: ProblemListItem[];
    total: number;
  }> {
    const query = new URLSearchParams();
    if (params?.difficulty) query.set('difficulty', params.difficulty);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await request<ProblemListItem[]>(`/problems${qs}`);
    return {
      items: res.data,
      total: res.pagination?.total ?? res.data.length,
    };
  },

  async getProblemById(id: number): Promise<ProblemDetail> {
    const res = await request<ProblemDetail>(`/problems/${id}`);
    return res.data;
  },

  // Bookmarks
  async getUserBookmarks(userId: number): Promise<BookmarkItem[]> {
    const res = await request<BookmarkItem[]>(`/bookmarks/user/${userId}`);
    return res.data;
  },

  async addBookmark(userId: number, problemId: number): Promise<BookmarkItem> {
    const res = await request<BookmarkItem>('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, problem_id: problemId }),
    });
    return res.data;
  },

  async removeBookmark(userId: number, problemId: number): Promise<void> {
    await request<unknown>(`/bookmarks/${userId}/${problemId}`, {
      method: 'DELETE',
    });
  },

  // Notes
  async getNote(userId: number, problemId: number): Promise<NoteItem | null> {
    try {
      const res = await request<NoteItem>(`/notes/${userId}/${problemId}`);
      return res.data;
    } catch {
      return null;
    }
  },

  async upsertNote(
    userId: number,
    problemId: number,
    notesDescription: string
  ): Promise<NoteItem> {
    const res = await request<NoteItem>('/notes', {
      method: 'PUT',
      body: JSON.stringify({
        user_id: userId,
        problem_id: problemId,
        notes_description: notesDescription,
      }),
    });
    return res.data;
  },

  // Submissions
  async createSubmission(data: {
    user_id: number;
    problem_id: number;
    language: SupportedLanguage;
    source_code: string;
  }): Promise<SubmissionItem> {
    const res = await request<SubmissionItem>('/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getSubmissionById(id: number): Promise<SubmissionItem> {
    const res = await request<SubmissionItem>(`/submissions/${id}`);
    return res.data;
  },

  async listSubmissions(params: {
    user_id?: number;
    problem_id?: number;
    limit?: number;
  }): Promise<SubmissionItem[]> {
    const query = new URLSearchParams();
    if (params.user_id) query.set('user_id', String(params.user_id));
    if (params.problem_id) query.set('problem_id', String(params.problem_id));
    if (params.limit) query.set('limit', String(params.limit));

    const res = await request<SubmissionItem[]>(
      `/submissions?${query.toString()}`
    );
    return res.data;
  },
};
