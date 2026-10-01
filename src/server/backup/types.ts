export type BackupScope = 'TENANT' | 'PLATFORM_FULL';
export type BackupStatus = 'COMPLETED' | 'FAILED' | 'VERIFYING' | 'CORRUPTED';
export type BackupTriggerType = 'AUTOMATED_CRON' | 'MANUAL_ADMIN' | 'PRE_UPGRADE';

export interface BackupMetadata {
  id: string;
  scope: BackupScope;
  businessId?: string;
  businessName?: string;
  version: string;
  timestamp: string;
  checksumSha256: string;
  sizeBytes: number;
  tablesIncluded: string[];
  recordCounts: Record<string, number>;
  encrypted: boolean;
  storageLocation: string;
  retentionExpiresAt: string;
  triggeredBy: string;
  triggerType: BackupTriggerType;
  status: BackupStatus;
}

export interface BackupPayload {
  metadata: Omit<BackupMetadata, 'checksumSha256' | 'sizeBytes' | 'storageLocation'>;
  data: Record<string, any[]>;
}

export interface RestoreValidationResult {
  valid: boolean;
  backupId: string;
  scope: BackupScope;
  timestamp: string;
  checksumMatch: boolean;
  expectedChecksum: string;
  calculatedChecksum: string;
  recordCounts: Record<string, number>;
  errors: string[];
  warnings: string[];
}

export interface RestoreExecutionResult {
  success: boolean;
  backupId: string;
  restoredAt: string;
  recordsRestored: Record<string, number>;
  integrityVerified: boolean;
  dryRun: boolean;
  error?: string;
}

export interface DisasterRecoveryStatus {
  lastAutomatedBackup?: BackupMetadata;
  lastVerifiedAt?: string;
  totalBackupsAvailable: number;
  rpoHours: number; // Recovery Point Objective achieved
  rtoMinutesEstimated: number; // Recovery Time Objective
  storageDriver: string;
  automatedScheduleActive: boolean;
  retentionDays: number;
}

export interface IBackupStorageProvider {
  readonly driverName: string;
  saveBackup(id: string, content: string): Promise<{ storageLocation: string; sizeBytes: number }>;
  readBackup(storageLocation: string): Promise<string>;
  deleteBackup(storageLocation: string): Promise<void>;
  listBackups?(): Promise<string[]>;
}
