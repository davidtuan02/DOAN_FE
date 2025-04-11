export interface SavedFilter {
  id?: string;
  name: string;
  description?: string;
  owner: string; // userId of who created the filter
  isShared: boolean;
  isStarred: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  criteria: FilterCriteria;
}

export interface FilterCriteria {
  projectId?: string;
  types?: string[];
  statuses?: string[];
  priorities?: string[];
  assigneeIds?: string[];
  searchTerm?: string;
  createdWithin?: number; // days
  updatedWithin?: number; // days
  extraCriteria?: Record<string, any>;
}
