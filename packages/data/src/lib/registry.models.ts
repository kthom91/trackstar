import { Type } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Base data model representing a record from a specific lexicon
 */
export interface LexiconRecord<T = any> {
  uri: string;
  cid: string;
  value: T & {
    $type: string;
    createdAt: string;
  };
}

/**
 * Common shape for the parsed timeline view of any record
 */
export interface NormalizedTimelineItem {
  id: string;
  lexiconId: string;
  title: string;
  subtitle?: string; // e.g. Author or Director
  date: Date;
  imageUrl?: string;
  status: string;
  rawRecord: LexiconRecord;
}

/**
 * Defines a form field for manual entry
 */
export interface ManualEntryField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'boolean' | 'url' | 'select';
  options?: { label: string; value: string }[];
  required: boolean;
}

/**
 * Interface that all Media/Event modules must implement
 */
export interface TrackstarModule<ProviderT = any, LexiconT = any> {
  /** The AT Protocol Lexicon identifier (e.g. 'app.trackstar.movie' or 'list.teal.scrobble') */
  lexiconId: string;
  
  /** Display metadata */
  displayName: string;
  icon: string;
  
  /** 
   * Provider API fetching logic (used when users search for a new item to log).
   * Optional because some types might be manual-entry only.
   */
  searchProvider?: (query: string, apiKey?: string) => Observable<ProviderT[]>;
  
  /** Transform raw Provider result into the Lexicon schema shape ready for PDB */
  mapProviderToLexicon?: (providerResult: ProviderT) => LexiconT;
  
  /** Transform raw Lexicon PDB record into normalized item for the Unified Timeline */
  normalizeRecord: (record: LexiconRecord<LexiconT>) => NormalizedTimelineItem;

  /** Manual Entry definition (used to generate the form dynamically) */
  manualEntryForm: ManualEntryField[];

  /** Angular Component class to render this item in the Unified Timeline */
  timelineCardComponent: Type<any>;
}

/**
 * The Registry interface for registering and retrieving modules
 */
export interface ModuleRegistry {
  register(module: TrackstarModule): void;
  getModule(lexiconId: string): TrackstarModule | undefined;
  getAllModules(): TrackstarModule[];
  getSupportedLexicons(): string[];
}
