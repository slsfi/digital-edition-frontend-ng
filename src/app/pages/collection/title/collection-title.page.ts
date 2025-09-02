import { Component, ElementRef, LOCALE_ID, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController, PopoverController } from '@ionic/angular';
import { catchError, combineLatest, map, Observable, of, switchMap, tap } from 'rxjs';

import { config } from '@config';
import { ReferenceDataModal } from '@modals/reference-data/reference-data.modal';
import { Textsize } from '@models/textsize.model';
import { ViewOptionsPopover } from '@popovers/view-options/view-options.popover';
import { CollectionContentService } from '@services/collection-content.service';
import { HtmlParserService } from '@services/html-parser.service';
import { MarkdownService } from '@services/markdown.service';
import { PlatformService } from '@services/platform.service';
import { ScrollService } from '@services/scroll.service';
import { ViewOptionsService } from '@services/view-options.service';


@Component({
  selector: 'page-title',
  templateUrl: './collection-title.page.html',
  styleUrls: ['./collection-title.page.scss'],
  standalone: false
})
export class CollectionTitlePage implements OnInit {
  private collectionContentService = inject(CollectionContentService);
  private elementRef = inject(ElementRef);
  private mdService = inject(MarkdownService);
  private modalController = inject(ModalController);
  private parserService = inject(HtmlParserService);
  private popoverCtrl = inject(PopoverController);
  private route = inject(ActivatedRoute);
  private scrollService = inject(ScrollService);
  private platformService = inject(PlatformService);
  viewOptionsService = inject(ViewOptionsService);
  private activeLocale = inject(LOCALE_ID);

  readonly loadContentFromMarkdown: boolean = config.page?.title?.loadContentFromMarkdown ?? false;
  readonly replaceImageAssetsPaths: boolean = config.collections?.replaceImageAssetsPaths ?? true;
  readonly showURNButton: boolean = config.page?.title?.showURNButton ?? false;
  readonly showViewOptionsButton: boolean = config.page?.title?.showViewOptionsButton ?? true;

  _activeComponent: boolean = true;
  collectionID: string = '';
  intervalTimerId: number = 0;
  mobileMode: boolean = false;
  searchMatches: string[] = [];
  text$: Observable<string | null>;

  TextsizeEnum = Textsize;

  ngOnInit() {
    this.mobileMode = this.platformService.isMobile();

    this.text$ = combineLatest(
      [this.route.params, this.route.queryParams]
    ).pipe(
      map(([params, queryParams]) => ({...params, ...queryParams})),
      tap(({collectionID, q}) => {
        this.collectionID = collectionID;
        if (q) {
          this.searchMatches = this.parserService.getSearchMatchesFromQueryParams(q);
          if (this.searchMatches.length) {
            this.scrollService.scrollToFirstSearchMatch(this.elementRef.nativeElement, this.intervalTimerId);
          }
        }
      }),
      switchMap(({collectionID}) => {
        return this.loadTitle(collectionID, this.activeLocale);
      })
    );
  }

  ionViewWillEnter() {
    this._activeComponent = true;
  }

  ionViewWillLeave() {
    this._activeComponent = false;
  }

  private loadTitle(id: string, lang: string): Observable<string | null> {
    if (!this.loadContentFromMarkdown) {
      return this.collectionContentService.getTitle(id, lang).pipe(
        map((res: any) => {
          if (res?.content && res?.content !== 'File not found') {
            let text = this.replaceImageAssetsPaths
              ? res.content.replace(/src="images\//g, 'src="assets/images/')
              : res.content;
            return this.parserService.insertSearchMatchTags(text, this.searchMatches);
          } else {
            return $localize`:@@CollectionTitle.None:Titelbladet kunde inte laddas.`;
          }
        }),
        catchError((e: any) => {
          console.error(e);
          return of($localize`:@@CollectionTitle.None:Titelbladet kunde inte laddas.`);
        })
      );
    } else {
      return this.mdService.getParsedMdContent(
        `${lang}-09-${id}`,
        $localize`:@@CollectionTitle.None:Titelbladet kunde inte laddas.`
      );
    }
  }

  async showViewOptionsPopover(event: any) {
    const toggles = {
      'comments': false,
      'personInfo': false,
      'placeInfo': false,
      'workInfo': false,
      'emendations': false,
      'normalisations': false,
      'abbreviations': false,
      'paragraphNumbering': false,
      'pageBreakOriginal': false,
      'pageBreakEdition': false
    };

    const popover = await this.popoverCtrl.create({
      component: ViewOptionsPopover,
      componentProps: { toggles },
      cssClass: 'view-options-popover',
      reference: 'trigger',
      side: 'bottom',
      alignment: 'end'
    });

    popover.present(event);
  }

  async showReference() {
    const modal = await this.modalController.create({
      component: ReferenceDataModal,
      componentProps: { origin: 'page-title' }
    });

    modal.present();
  }

}
