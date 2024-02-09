import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';

import { config } from '@config';
import { flattenObjectTree, sortArrayOfObjectsAlphabetically, sortArrayOfObjectsNumerically } from '@utility-functions';


@Injectable({
  providedIn: 'root',
})
export class CollectionTableOfContentsService {
  private activeTocOrder: BehaviorSubject<string> = new BehaviorSubject('default');
  private apiURL: string = '';
  private cachedTOC: any = {};
  private cachedFlattenedTOC: any = {};
  private currentCollectionTOC$ = new BehaviorSubject<any>(null);
  private currentFlattenedCollectionTOC$ = new BehaviorSubject<any>(null);
  private multilingualTOC: boolean = false;

  constructor(
    private http: HttpClient,
    @Inject(LOCALE_ID) private activeLocale: string
  ) {
    const apiBaseURL = config.app?.backendBaseURL ?? '';
    const projectName = config.app?.projectNameDB ?? '';
    this.apiURL = apiBaseURL + '/' + projectName;
    this.multilingualTOC = config.app?.i18n?.multilingualCollectionTableOfContents ?? false;
  }

  getTableOfContents(id: string): Observable<any> {
    if (this.cachedTOC?.collectionId === id) {
      return of(this.cachedTOC);
    } else {
      const locale = this.multilingualTOC ? '/' + this.activeLocale : '';
      const endpoint = `${this.apiURL}/toc/${id}${locale}`;

      return this.http.get(endpoint).pipe(
        tap({
          next: (res: any) => {
            this.cachedTOC = res;
            this.cachedFlattenedTOC = {
              collectionId: res.collectionId,
              text: res.text,
              children: flattenObjectTree(res, 'children', 'itemId')
            };
          },
          error: error => {
            this.cachedTOC = {};
            this.cachedFlattenedTOC = {};
          }
        }),
        catchError((e: any) => {
          return of({});
        })
      );
    }
  }

  getFlattenedTableOfContents(id: string): Observable<any> {
    if (this.cachedFlattenedTOC?.collectionId === id) {
      return of(this.cachedFlattenedTOC);
    } else {
      return this.getTableOfContents(id).pipe(
        map((toc: any) => {
          if (toc?.collectionId === id) {
            return this.cachedFlattenedTOC;
          } else {
            return {};
          }
        })
      );
    }
  }

  /**
   * Get first TOC item which has 'itemId' property and 'type' property
   * has value other than 'subtitle' and 'section_title'.
   * @param collectionID 
   * @param language optional
   */
  getFirstItem(collectionID: string, language?: string): Observable<any> {
    language = language && this.multilingualTOC ? '/' + language : '';
    const endpoint = `${this.apiURL}/toc-first/${collectionID}${language}`;
    return this.http.get(endpoint);
  }

  setActiveTocOrder(newTocOrder: string) {
    this.activeTocOrder.next(newTocOrder);
  }

  getActiveTocOrder(): Observable<string> {
    return this.activeTocOrder.asObservable();
  }

  setCurrentCollectionTOC(collectionId: string) {
    if (collectionId) {
      this.getTableOfContents(collectionId).subscribe((toc: any) => {
        this.currentCollectionTOC$.next(toc);
        this.currentFlattenedCollectionTOC$.next(this.cachedFlattenedTOC);
      });
    } else {
      this.currentCollectionTOC$.next({});
      this.currentFlattenedCollectionTOC$.next([]);
    }
  }

  getCurrentCollectionTOC(): Observable<any> {
    return this.currentCollectionTOC$.asObservable();
  }

  getCurrentFlattenedCollectionTOC(): Observable<any> {
    return this.currentFlattenedCollectionTOC$.asObservable();
  }

  getStaticTableOfContents(id: string): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'text/html; charset=UTF-8'
    });
    const endpoint = `http://localhost:4201/static-html/collection-toc/${id}_${this.activeLocale}.htm`;

    return this.http.get(endpoint, {headers, responseType: 'text'}).pipe(
      catchError((error) => {
        console.log('Error loading static html', error);
        return of('');
      })
    );
  }

  /**
   * Given a flattened collection TOC as the array `flattenedMenuData`,
   * returns a new array where the TOC items have been sorted alphabetically
   * (ascendingly) on the 'text' property of each item.
   */
  constructAlphabeticalMenu(flattenedMenuData: any[]) {
    const alphabeticalMenu: any[] = [];

    for (const child of flattenedMenuData) {
      if (child.itemId) {
        alphabeticalMenu.push(child);
      }
    }

    sortArrayOfObjectsAlphabetically(alphabeticalMenu, 'text');
    return alphabeticalMenu;
  }

  /**
   * Given a flattened collection TOC as the array `flattenedMenuData`,
   * returns a new array where the TOC items have been sorted according
   * to the `primarySortKey` and (optional) `secondarySortKey` properties.
   * If `returnFlattened` is true, the returned array is flattened, retaining
   * only items with `itemId` property.
   */
  constructCategoricalMenu(
    flattenedMenuData: any[],
    primarySortKey: string,
    secondarySortKey?: string,
    returnFlattened: boolean = false
  ) {
    const orderedList: any[] = [];

    for (const child of flattenedMenuData) {
      if (
        child[primarySortKey] &&
        ((secondarySortKey && child[secondarySortKey]) || !secondarySortKey) &&
        child.itemId
      ) {
        orderedList.push(child);
      }
    }

    if (primarySortKey === 'date') {
      sortArrayOfObjectsNumerically(orderedList, primarySortKey, 'asc');
    } else {
      sortArrayOfObjectsAlphabetically(orderedList, primarySortKey);
    }

    const categoricalMenu: any[] = [];
    let childItems: any[] = [];
    let prevCategory = '';

    for (let i = 0; i < orderedList.length; i++) {
      let currentCategory = orderedList[i][primarySortKey];
      if (primarySortKey === 'date') {
        currentCategory = String(currentCategory).split('-')[0];
      }

      if (prevCategory === '') {
        prevCategory = currentCategory;
        categoricalMenu.push({type: 'subtitle', collapsed: true, text: prevCategory, children: []});
      }

      if (prevCategory !== currentCategory) {
        if (secondarySortKey === 'date') {
          sortArrayOfObjectsNumerically(childItems, secondarySortKey, 'asc');
        } else if (secondarySortKey) {
          sortArrayOfObjectsAlphabetically(childItems, secondarySortKey);
        }
        categoricalMenu[categoricalMenu.length - 1].children = childItems;
        childItems = [];
        prevCategory = currentCategory;
        categoricalMenu.push({type: 'subtitle', collapsed: true, text: prevCategory, children: []});
      }
      childItems.push(orderedList[i]);
    }

    if (childItems.length > 0) {
      if (secondarySortKey === 'date') {
        sortArrayOfObjectsNumerically(childItems, secondarySortKey, 'asc');
      } else if (secondarySortKey) {
        sortArrayOfObjectsAlphabetically(childItems, secondarySortKey);
      }
    }

    if (categoricalMenu.length > 0) {
      categoricalMenu[categoricalMenu.length - 1].children = childItems;
    } else {
      categoricalMenu[0] = {};
      categoricalMenu[0].children = childItems;
    }

    return returnFlattened
          ? flattenObjectTree({children: categoricalMenu}, 'children', 'itemId')
          : categoricalMenu;
  }

}
