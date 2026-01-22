export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiResponseMeta {
  pagination?: PaginationMeta;
  requestId?: string;
  [key: string]: unknown;
}

export interface PaginationMeta {
  cursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: FieldError[];
  requestId?: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginatedResult<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface CursorPayload {
  lastId: string;
  lastValue?: string | number;
}
