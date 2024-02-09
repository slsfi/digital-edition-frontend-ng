import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { combineLatest, distinctUntilChanged, Subscription } from 'rxjs';

import { config } from '@config';
import { CollectionTableOfContentsService } from '@services/collection-toc.service';
import { DocumentHeadService } from '@services/document-head.service';
import { CollectionPagePathPipe } from '@pipes/collection-page-path.pipe';
import { CollectionPagePositionQueryparamPipe } from '@pipes/collection-page-position-queryparam.pipe';
import { PlatformService } from '@services/platform.service';


/**
 * Component for displaying the title of the current collection page as well
 * as links to the previous and next collection page based on the collection
 * menu/table of contents. This component is responsible for setting the 
 * document title to the title of the current text for collection pages.
 * Thus this component must always be server-side rendered.
 */
@Component({
  standalone: true,
  selector: 'text-changer',
  templateUrl: './text-changer.component.html',
  styleUrls: ['./text-changer.component.scss'],
  imports: [NgIf, RouterLink, IonicModule, CollectionPagePathPipe, CollectionPagePositionQueryparamPipe]
})
export class TextChangerComponent implements OnChanges, OnDestroy, OnInit {
  @Input() parentPageType: string = '';
  @Input() textItemID: string = '';
  @Input() textPosition: string = '';

  activeTocOrder: string = '';
  categoricalTocPrimarySortKey: string = 'date';
  categoricalTocSecondarySortKey: string = '';
  collectionId: string = '';
  collectionTitle: string = '';
  currentTocTextIndex: number = 0;
  flattenedToc: any[] = [];
  frontMatterPages: any[] = [];
  mobileMode: boolean = false;
  tocItemId: string = '';
  tocSubscr: Subscription | null = null;
  unsortedFlattenedToc: any[] = [];

  constructor(
    private headService: DocumentHeadService,
    private platformService: PlatformService,
    private tocService: CollectionTableOfContentsService
  ) {
    this.categoricalTocPrimarySortKey = config.component?.collectionSideMenu?.categoricalSortingPrimaryKey ?? 'date';
    this.categoricalTocSecondarySortKey = config.component?.collectionSideMenu?.categoricalSortingSecondaryKey ?? '';
  }

  ngOnChanges(changes: SimpleChanges) {
    let firstChange = true;
    for (const propName in changes) {
      if (changes.hasOwnProperty(propName)) {
        if (propName === 'textItemID') {
          if (!changes.textItemID.firstChange) {
            firstChange = false;
          }
        } else if (propName === 'textPosition') {
          if (!changes.textPosition.firstChange) {
            firstChange = false;
          }
        } else if (propName === 'parentPageType') {
          if (!changes.parentPageType.firstChange) {
            firstChange = false;
          }
        }
      }
    }

    if (!firstChange) {
      this.updateVariables();
      this.updateCurrentText();
    }
  }

  ngOnInit() {
    this.mobileMode = this.platformService.isMobile();
    this.updateVariables();
    this.setFrontmatterPagesArray();

    // Subscribe to BehaviorSubjects emitting the current sorting of
    // the collection TOC as well as the flattened TOC itself.
    // TODO: explore how sorted flattened TOCs could be cached so they
    // TODO: don't need to be recreated on every text change.
    this.tocSubscr = combineLatest([
      this.tocService.getActiveTocOrder().pipe(distinctUntilChanged()),
      this.tocService.getCurrentFlattenedCollectionTOC()
    ]).subscribe(([tocOrder, toc]) => {
      if (
        toc?.children?.length &&
        this.collectionId === toc?.collectionId
      ) {
        this.collectionTitle = toc.text || '';
        this.unsortedFlattenedToc = toc.children;
        let sortedToc = toc.children;
        if (tocOrder !== this.activeTocOrder) {
          this.activeTocOrder = tocOrder;
          if (
            this.activeTocOrder === 'alphabetical' &&
            config.component?.collectionSideMenu?.sortableCollectionsAlphabetical?.includes(this.collectionId)
          ) {
            sortedToc = this.tocService.constructAlphabeticalMenu(toc.children);
          } else if (
            this.activeTocOrder === 'chronological' &&
            config.component?.collectionSideMenu?.sortableCollectionsChronological?.includes(this.collectionId)
          ) {
            sortedToc = this.tocService.constructCategoricalMenu(
              toc.children, 'date', undefined, true
            );
          } else if (
            this.activeTocOrder === 'categorical' &&
            config.component?.collectionSideMenu?.sortableCollectionsCategorical?.includes(this.collectionId)
          ) {
            sortedToc = this.tocService.constructCategoricalMenu(
              toc.children,
              this.categoricalTocPrimarySortKey,
              this.categoricalTocSecondarySortKey,
              true
            )
          } else if (this.unsortedFlattenedToc.length) {
            sortedToc = this.unsortedFlattenedToc;
          }
        }
        // Prepend the frontmatter pages to the TOC array
        this.flattenedToc = this.frontMatterPages.concat(sortedToc);
        // Search for the current text in the array and display it
        this.updateCurrentText();
      }
    });
  }

  ngOnDestroy() {
    this.tocSubscr?.unsubscribe();
  }

  private updateVariables() {
    if (!this.parentPageType) {
      this.parentPageType = 'text';
    }

    this.collectionId = this.textItemID.split('_')[0];
    this.tocItemId = this.textPosition
          ? this.textItemID + ';' + this.textPosition
          : this.textItemID;
  }

  private setFrontmatterPagesArray() {
    if (config.collections?.frontMatterPages?.cover) {
      this.frontMatterPages.push({
        text: $localize`:@@CollectionCover.Cover:Omslag`,
        page: 'cover',
        itemId: this.collectionId
      });
    }
    if (config.collections?.frontMatterPages?.title) {
      this.frontMatterPages.push({
        text: $localize`:@@CollectionTitle.TitlePage:Titelblad`,
        page: 'title',
        itemId: this.collectionId
      });
    }
    if (config.collections?.frontMatterPages?.foreword) {
      this.frontMatterPages.push({
        text: $localize`:@@CollectionForeword.Foreword:Förord`,
        page: 'foreword',
        itemId: this.collectionId
      });
    }
    if (config.collections?.frontMatterPages?.introduction) {
      this.frontMatterPages.push({
        text: $localize`:@@CollectionIntroduction.Introduction:Inledning`,
        page: 'introduction',
        itemId: this.collectionId
      });
    }
  }

  /**
   * Updates the text that's displayed as the current text (as well as the
   * previous and next text), and sets the document title to the current
   * text title. If the current text is a positioned heading in a longer
   * text, the patent text title is set as the document title.
   */
  private updateCurrentText() {
    const foundTextIndex = this.getCurrentTextIndex();
    if (foundTextIndex > -1) {
      this.currentTocTextIndex = foundTextIndex;
    } else {
      console.error('Unable to find the current text in flattenedTOC in text-changer component.');
      this.currentTocTextIndex = 0;
    }

    // Set the document title to the current text title.
    // Positioned item's title should not be set, instead we have to
    // search for the non-positioned item's title.
    let titleItemIndex = this.currentTocTextIndex;
    if (this.textPosition) {
      titleItemIndex = this.flattenedToc.findIndex(
        ({ itemId }) => itemId === this.textItemID
      );
    }
    this.headService.setTitle([
      this.flattenedToc[titleItemIndex].text || '', this.collectionTitle
    ]);
  }

  private getCurrentTextIndex() {
    let currentTextIndex = -1;
    for (let i = 0; i < this.flattenedToc.length; i++) {
      if (!this.flattenedToc[i].page) {
        // Text page
        if (this.flattenedToc[i].itemId === this.tocItemId) {
          return i;
        }
      } else if (this.flattenedToc[i].page === this.parentPageType) {
        // Front matter page
        return i;
      }
    }
    return currentTextIndex;
  }

}
