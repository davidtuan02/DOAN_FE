export interface Attachment {
  id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  path: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttachmentUploadResponse {
  id: string;
  filename: string;
  originalname: string;
  mimetype: string;
  path: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}
