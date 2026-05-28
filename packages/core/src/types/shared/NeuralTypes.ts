/**
 * Neural Architecture Types
 */

export interface NeuralCacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

export interface PatternAnalysisResult {
  pattern: string;
  frequency: number;
  confidence: number;
  metadata?: Record<string, any>;
}




