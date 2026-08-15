export interface User {
  id: number;
  username: string;
}

export interface JwtPayload extends User {
  iat?: number;
  exp?: number;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}
