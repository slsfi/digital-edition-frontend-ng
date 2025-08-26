import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { config } from '@config';
import { TextKey } from '@models/collection.model';


@Injectable({
  providedIn: 'root',
})
export class CollectionContentService {
  private http = inject(HttpClient);

  private readonly apiURL: string = `${config.app?.backendBaseURL ?? ''}/${config.app?.projectNameDB ?? ''}`;

  activeCollectionTextMobileModeView: number | undefined = undefined;
  previousReadViewTextId: string = '';
  readViewTextId: string = '';
  recentCollectionTextViews: any[] = [];

  getTitle(collectionId: string, language: string): Observable<any> {
    const endpoint = `${this.apiURL}/text/${collectionId}/1/tit/${language}`;
    return this.http.get(endpoint);
  }

  getForeword(collectionId: string, language: string): Observable<any> {
    const endpoint = `${this.apiURL}/text/${collectionId}/fore/${language}`;
    return this.http.get(endpoint);
  }

  getIntroduction(collectionId: string, language: string): Observable<any> {
    const endpoint = `${this.apiURL}/text/${collectionId}/1/inl/${language}`;
    return this.http.get(endpoint);
  }

  getReadingText(textKey: TextKey, language: string = ''): Observable<any> {
    const estFolder = language ? 'est-i18n' : 'est';
    const ch_id = textKey.chapterID ? `/${textKey.chapterID}` : '';
    const lang = language ? `/${language}` : '';
    const endpoint = `${this.apiURL}/text/`
          + `${textKey.collectionID}/${textKey.publicationID}/${estFolder}${ch_id}${lang}`;
    return this.http.get(endpoint);
  }

  getManuscripts(textKey: TextKey, ms_id?: number | string): Observable<any> {
    const ch_id = textKey.chapterID ? `/${textKey.chapterID}` : '';
    ms_id = ms_id ? '/' + ms_id : '';
    const endpoint = `${this.apiURL}/text/${textKey.collectionID}/${textKey.publicationID}/ms${ms_id}${ch_id}`;
    return this.http.get(endpoint);
  }

  getManuscriptsList(textKey: TextKey): Observable<any> {
    const endpoint = `${this.apiURL}/text/${textKey.collectionID}/${textKey.publicationID}/list/ms`;
    return this.http.get(endpoint);
  }

  getVariants(textKey: TextKey): Observable<any> {
    const ch_id = textKey.chapterID ? `/${textKey.chapterID}` : '';
    const endpoint = `${this.apiURL}/text/${textKey.collectionID}/${textKey.publicationID}/var${ch_id}`;
    return this.http.get(endpoint);
  }

  getFacsimiles(textKey: TextKey): Observable<any> {
    const ch_id = textKey.chapterID ? `/${textKey.chapterID.replace('ch', '')}` : '';
    const endpoint = `${this.apiURL}/facsimiles/${textKey.publicationID}${ch_id}`;
    return this.http.get(endpoint);
  }

  getMetadata(publicationId: string, language: string): Observable<any> {
    const endpoint = `${this.apiURL}/publications/${publicationId}/metadata/${language}`;
    return this.http.get(endpoint);
  }

  getDownloadableIntroduction(collectionId: string, format: string, language: string): Observable<any> {
    const endpoint = `${this.apiURL}/text/downloadable/${format}/${collectionId}/inl/${language}`;
    return this.http.get(endpoint);
  }

  getDownloadableReadingText(textKey: TextKey, format: string, language: string = ''): Observable<any> {
    const estFolder = language ? 'est-i18n' : 'est';
    const ch_id = textKey.chapterID ? `/${textKey.chapterID}` : '';
    const lang = language ? `/${language}` : '';
    const endpoint = `${this.apiURL}/text/downloadable/`
          + `${format}/${textKey.collectionID}/${textKey.publicationID}/${estFolder}${ch_id}${lang}`;
    return this.http.get(endpoint);
  }

  getDownloadableManuscript(textKey: TextKey, msID: number, format: string): Observable<any> {
    const ch_id = textKey.chapterID ? `/${textKey.chapterID}` : '';
    const endpoint = `${this.apiURL}/text/downloadable/`
          + `${format}/${textKey.collectionID}/${textKey.publicationID}/ms/${msID}${ch_id}`;
    return this.http.get(endpoint);
  }

}
