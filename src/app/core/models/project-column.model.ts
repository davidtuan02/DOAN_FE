export interface ProjectColumn {
  id: string;
  name: string;
  order: number;
  projectId: string;
  color?: string;
  description?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectColumnCreateDto {
  name: string;
  order?: number;
  projectId: string;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

export interface ProjectColumnUpdateDto {
  id: string;
  name?: string;
  order?: number;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

export interface ProjectColumnDeleteDto {
  id: string;
  projectId: string;
}

export interface ReorderColumnsDto {
  projectId: string;
  columnOrders: {
    id: string;
    order: number;
  }[];
}
