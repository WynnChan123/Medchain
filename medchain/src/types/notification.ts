export enum NotificationType {
  PendingAdminRequest = "PENDING_ADMIN_REQUEST",
  MedicalRecordCreated = "MEDICAL_RECORD_CREATED",
  MedicalRecordShared = "MEDICAL_RECORD_SHARED",
  PendingInsurerRequest = "PENDING_INSURER_REQUEST",
}

export interface Notification {
  id: string | number;
  type: NotificationType;
  message: string;
  createdAt: number; // Unix timestamp in milliseconds
  metadata?: {
    [key: string]: any;
  };
}
