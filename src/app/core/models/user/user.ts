export enum UserRole {
  ADMIN = 'ADMIN',
  BASIC = 'BASIC',
  LEADER = 'LEADER',
}

export interface User {
  id: string;
  createdAt: string;
  updatedAt: string;
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  username: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
