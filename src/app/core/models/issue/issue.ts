import { IssueType, IssueStatus, IssuePriority } from '../../enums';
import { Comment } from '../';

export interface Issue {
  id: string;
  title: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  listPosition: number;
  description: string;
  estimate: number;
  timeSpent: number;
  timeRemaining: number;
  createdAt: string;
  updatedAt: string;
  reporterId: string;
  userIds: string[];
  comments: Comment[];
  projectId: string;
}