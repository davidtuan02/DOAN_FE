import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BASE_URL } from '../constants/api.const';

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  color?: string;
  description?: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBoardColumnDto {
  name: string;
  order?: number;
  boardId?: string;
  projectId?: string;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateBoardColumnDto {
  name?: string;
  order?: number;
  color?: string;
  description?: string;
  isDefault?: boolean;
}

export interface ReorderBoardColumnsDto {
  boardId?: string;
  projectId?: string;
  columnOrders: { id: string; order: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class BoardColumnService {
  private apiUrl = `${BASE_URL}/board-columns`;

  constructor(private http: HttpClient) {}

  getColumnsByBoardId(boardId: string): Observable<BoardColumn[]> {
    return this.http
      .get<BoardColumn[]>(`${this.apiUrl}/board/${boardId}`)
      .pipe(tap((columns) => console.log('Fetched board columns:', columns)));
  }

  getColumnsByProjectId(projectId: string): Observable<BoardColumn[]> {
    return this.http
      .get<BoardColumn[]>(`${this.apiUrl}/project/${projectId}`)
      .pipe(tap((columns) => console.log('Fetched project columns:', columns)));
  }

  createColumn(column: CreateBoardColumnDto): Observable<BoardColumn> {
    return this.http
      .post<BoardColumn>(`${this.apiUrl}`, column)
      .pipe(tap((newColumn) => console.log('Created column:', newColumn)));
  }

  updateColumn(
    id: string,
    column: UpdateBoardColumnDto
  ): Observable<BoardColumn> {
    return this.http
      .put<BoardColumn>(`${this.apiUrl}/${id}`, column)
      .pipe(
        tap((updatedColumn) => console.log('Updated column:', updatedColumn))
      );
  }

  deleteColumn(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(tap(() => console.log('Deleted column id:', id)));
  }

  reorderColumns(
    reorderDto: ReorderBoardColumnsDto
  ): Observable<BoardColumn[]> {
    console.log('Sending reorder request to API:', reorderDto);
    return this.http
      .put<BoardColumn[]>(`${this.apiUrl}/reorder`, reorderDto)
      .pipe(
        tap(
          (columns) => console.log('Columns reordered successfully:', columns),
          (error) => console.error('Error reordering columns:', error)
        )
      );
  }
}
