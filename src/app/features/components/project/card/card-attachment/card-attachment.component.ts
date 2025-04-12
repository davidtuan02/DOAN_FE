import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { AttachmentService } from '../../../../../services/attachment.service';
import { Attachment } from '../../../../../core/models';
import { SvgIconComponent } from '../../../../../shared/components';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-card-attachment',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, SvgIconComponent, NzPopconfirmModule],
  templateUrl: './card-attachment.component.html',
  styleUrls: ['./card-attachment.component.scss'],
})
export class CardAttachmentComponent implements OnInit {
  @Input() cardId: string = '';

  attachments: Attachment[] = [];
  isLoading = false;
  uploading = false;

  constructor(
    private attachmentService: AttachmentService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadAttachments();
  }

  loadAttachments(): void {
    this.isLoading = true;
    this.attachmentService.getAttachmentsByTaskId(this.cardId).subscribe({
      next: (attachments) => {
        this.attachments = attachments;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading attachments:', error);
        this.isLoading = false;
      },
    });
  }

  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;

    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      this.uploadFile(file);

      // Reset the file input
      fileInput.value = '';
    }
  }

  uploadFile(file: File): void {
    this.uploading = true;
    this.attachmentService.uploadAttachment(file, this.cardId).subscribe({
      next: (response) => {
        this.message.success(`${file.name} uploaded successfully`);
        this.attachments.push(response);
        this.uploading = false;
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        this.message.error(`Failed to upload ${file.name}`);
        this.uploading = false;
      },
    });
  }

  downloadAttachment(attachment: Attachment): void {
    this.attachmentService.downloadAttachment(attachment.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.originalname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading attachment:', error);
        this.message.error(`Failed to download ${attachment.originalname}`);
      },
    });
  }

  deleteAttachment(attachment: Attachment): void {
    this.attachmentService.deleteAttachment(attachment.id).subscribe({
      next: () => {
        this.message.success(`${attachment.originalname} deleted successfully`);
        this.attachments = this.attachments.filter(
          (a) => a.id !== attachment.id
        );
      },
      error: (error) => {
        console.error('Error deleting attachment:', error);
        this.message.error(`Failed to delete ${attachment.originalname}`);
      },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf')) return 'pdf';
    if (mimetype.includes('word') || mimetype.includes('document'))
      return 'doc';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet'))
      return 'excel';
    if (mimetype.includes('zip') || mimetype.includes('compressed'))
      return 'zip';

    return 'file';
  }
}
