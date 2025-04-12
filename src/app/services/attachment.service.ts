import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Attachment, AttachmentUploadResponse } from '../core/models';

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  constructor(private http: HttpClient) {}

  private readonly API_URL = `${environment.apiBaseUrl}/api/attachments`;

  uploadAttachment(
    file: File,
    taskId: string
  ): Observable<AttachmentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<AttachmentUploadResponse>(
      `${this.API_URL}/upload/${taskId}`,
      formData
    );
  }

  getAttachmentsByTaskId(taskId: string): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.API_URL}/task/${taskId}`);
  }

  downloadAttachment(attachmentId: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/${attachmentId}/download`, {
      responseType: 'blob',
    });
  }

  deleteAttachment(attachmentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_URL}/${attachmentId}`
    );
  }
}
