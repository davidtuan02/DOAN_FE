export interface User {
  id: number;
  username: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  issueIds?: string[];
}
