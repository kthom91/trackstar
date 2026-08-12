import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface LogsResponse {
  items: UserLog[];
  totalCount: number;
}

export interface MediaItem {
  id: string;
  media_type: string;
  title: string;
  metadata_json: Record<string, any>;
  created_at: string;
}

export interface UserLog {
  id: string;
  media_item_id: string;
  status: string;
  rating?: number;
  review?: string;
  logged_at: string;
  completed_at?: string;
  synced_to_pds: boolean;
  at_uri?: string;
  at_cid?: string;
  media_item?: MediaItem;
}


export interface SyncJob {
  id?: number;
  connector_name: string;
  status: string;
  records_processed: number;
  error_message?: string;
  triggered_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8000/api/v1';

  getLogs(mediaType?: string, status?: string, search?: string, limit: number = 100, offset: number = 0, excludeStatus?: string): Observable<LogsResponse> {
    let params = new HttpParams();
    if (mediaType && mediaType !== 'all') params = params.set('media_type', mediaType);
    if (status && status !== 'all') params = params.set('status', status);
    if (excludeStatus) params = params.set('exclude_status', excludeStatus);
    if (search) params = params.set('search', search);
    params = params.set('limit', limit.toString());
    params = params.set('offset', offset.toString());


    return this.http.get<UserLog[]>(`${this.baseUrl}/logs`, { params, observe: 'response' }).pipe(
      map(resp => {
        const totalHeader = resp.headers.get('X-Total-Count');
        const items = resp.body || [];
        const totalCount = totalHeader ? parseInt(totalHeader, 10) : items.length;
        return { items, totalCount };
      })
    );
  }

  getStats(excludeStatus?: string, status?: string): Observable<Record<string, number>> {
    let params = new HttpParams();
    if (excludeStatus) params = params.set('exclude_status', excludeStatus);
    if (status) params = params.set('status', status);
    return this.http.get<Record<string, number>>(`${this.baseUrl}/logs/stats`, { params });
  }



  createLog(payload: {
    media_type: string;
    title: string;
    status: string;
    rating?: number;
    review?: string;
    media_item_id?: string;
    metadata_json?: Record<string, any>;
  }): Observable<UserLog> {
    return this.http.post<UserLog>(`${this.baseUrl}/logs`, payload);
  }

  deleteLog(logId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/logs/${logId}`);
  }

  uploadStorygraphCsv(file: File): Observable<SyncJob> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<SyncJob>(`${this.baseUrl}/importers/storygraph/upload`, formData);
  }

  uploadGoodreadsCsv(file: File): Observable<SyncJob> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<SyncJob>(`${this.baseUrl}/importers/goodreads/upload`, formData);
  }


  uploadLetterboxdCsv(file: File): Observable<SyncJob> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<SyncJob>(`${this.baseUrl}/importers/letterboxd/upload`, formData);
  }

  pollLetterboxdRss(rssUrl?: string): Observable<SyncJob> {
    return this.http.post<SyncJob>(`${this.baseUrl}/connectors/letterboxd/poll`, { rss_url: rssUrl });
  }

  syncSetlistFm(userId?: string): Observable<SyncJob> {
    return this.http.post<SyncJob>(`${this.baseUrl}/connectors/setlist-fm/sync`, { user_id: userId });
  }

  getSyncJobs(): Observable<SyncJob[]> {
    return this.http.get<SyncJob[]>(`${this.baseUrl}/sync/jobs`);
  }
}
