import { CardTypesEnum } from '../../enums';

export interface Card {
  id: string;
  ordinalId: number;
  title: string;
  type: CardTypesEnum;
  columnId: string;
  priority: string;
  assigneeId: string;
  reporterId: string;
  labels: Array<string>;
  description: string;
  startDate: string;
  dueDate: string;
  storyPoints?: number;
  parentTaskId?: string;
  childTaskIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PartialCard {
  id: string;
  ordinalId?: number;
  title?: string;
  type?: CardTypesEnum;
  columnId?: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  reporterId?: string;
  labels?: Array<string>;
  startDate?: string;
  dueDate?: string;
  storyPoints?: number;
  parentTaskId?: string;
  childTaskIds?: string[];
}
