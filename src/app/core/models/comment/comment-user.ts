import { User } from '../user/user';

export interface CommentUser {
  id: string;
  user?: User | null;
  content: string;
  cardId: string;
  createdAt: string;
}
