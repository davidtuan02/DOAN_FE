import { Issue, User } from '../';
import { ProjectCategory } from '../../enums';

export interface Project {
  id: string;
  name: string;
  url: string;
  description: string;
  category: ProjectCategory;
  createdAt: string;
  updateAt: string;
  issues: Issue[];
  users: User[];
}
