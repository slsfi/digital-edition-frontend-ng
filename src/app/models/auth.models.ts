export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  language: string;
}

export interface ForgotPasswordRequest {
  email: string;
  language: string;
}

export interface ResetPasswordRequest {
  password: string;
}

export type BackendAuthErrorCode =
  | 'NO_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'INCORRECT_CREDENTIALS'
  | 'INVALID_CREDENTIALS'
  | 'PASSWORD_TOO_SHORT'
  | 'USER_ALREADY_EXISTS';

export interface BackendAuthErrorResponse {
  msg: string;
  err?: BackendAuthErrorCode;
}

export interface LoginResponse {
  access_token: string;
  msg: string;
  refresh_token: string;
  user_projects: string[];
}

export interface RegisterResponse {
  msg: string;
}

export interface ForgotPasswordResponse {
  msg: string;
}

export interface ResetPasswordResponse {
  msg: string;
}

export interface RefreshTokenResponse {
  msg: string;
  access_token: string;
}
