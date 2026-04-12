// SolTax AU - AI Types

export type AITransactionType =
  | 'disposal'
  | 'acquisition'
  | 'income'
  | 'gift'
  | 'personal_use'
  | 'swap'
  | 'fee'
  | 'spam'
  | 'unknown';

export interface AIClassificationResponse {
  type: AITransactionType;
  confidence: number;
  explanation: string;
  reasoning: string;
  notes?: string;
}

export interface ClassificationPrompt {
  system: string;
  user: string;
}

// Re-export from main types
export type {
  ATOClassification,
  ATOTransactionType,
} from '@/types';
