import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { combineLatestWith, distinctUntilChanged, filter, map } from 'rxjs';

import { config } from '@config';
import { CollectionTableOfContentsService } from '@services/collection-toc.service';
import { DocumentHeadService } from '@services/document-head.service';
import { CollectionPagePathPipe } from '@pipes/collection-page-path.pipe';
import { CollectionPagePositionQueryparamPipe } from '@pipes/collection-page-position-queryparam.pipe';
import { PlatformService } from '@services/platform.service';
import { enableFrontMatterPageOrTextViewType } from '@utility-functions';


// -----------------------------------------------------------------------------
// * This component is zoneless-ready. *
// -----------------------------------------------------------------------------
/**
 * Component for displaying the title of the current collection page as well
 * as links to the previous and next collection page based on the collection
 * menu/table of contents. This component is responsible for setting the
 * document title to the title of the current text for collection pages.
 * Thus this component must always be server-side rendered.
 */
@Component({
  selector: 'text-changer',
  templateUrl: './text-changer.component.html',
  styleUrls: ['./text-changer.component.scss'],
  imports: [RouterLink, IonicModule, CollectionPagePathPipe, CollectionPagePositionQueryparamPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextChangerComponent {
  // -----------------------------------------------------------------------------
  // Dependency injection, Input signals, Fields, Local state signals
  // -----------------------------------------------------------------------------
  private headService = inject(DocumentHeadService);
  private platformService = inject(PlatformService);
  private route = inject(ActivatedRoute);
  private tocService = inject(CollectionTableOfContentsService);
  private destroyRef = inject(DestroyRef);

  readonly parentPageType = input<string>('text');
  // ionViewActive is true when the parent page component is active in the DOM,
  // i.e. the component has entered the Ionic life cycle hook ionViewWillEnter.
  // Set to false when the parent component has entered ionViewWillLeave life
  // cycle hook. This way we can react to ActivatedRoute changes only in active
  // components.
  readonly ionViewActive = input<boolean>(true);

  private activeMenuOrder = signal('');
  private collectionId = signal('');
  private collectionTitle = signal('');
  readonly currentTocTextIndex = signal(0);
  readonly flattenedToc = signal<any[]>([]);
  private textItemID = signal('');
  private textPosition = signal('');
  private tocItemId = signal('');
  readonly mobileMode = this.platformService.isMobile();

  readonly nextLabel: string = $localize`:@@TextChanger.NextLabel:Följande text`;
  readonly prevLabel: string = $localize`:@@TextChanger.PrevLabel:Föregående text`;


  // -----------------------------------------------------------------------------
  // Derived computeds (pure, no side-effects)
  // -----------------------------------------------------------------------------
  readonly prevItem = computed(() => {
    const items = this.flattenedToc();
    const index = this.currentTocTextIndex();
    return index > 0 ? items[index - 1] : null;
  });

  readonly currentItem = computed(() => {
    const items = this.flattenedToc();
    const index = this.currentTocTextIndex();
    return items.length > 0 ? items[index] : null;
  });

  readonly nextItem = computed(() => {
    const items = this.flattenedToc();
    const index = this.currentTocTextIndex();
    return index < items.length - 1 ? items[index + 1] : null;
  });


  // -----------------------------------------------------------------------------
  // Constructor: wire side effects (route/toc subscriptions and input reactions)
  // -----------------------------------------------------------------------------
  constructor() {
    this.registerTocAndRouteSubscription();
    this.registerIonViewActivationEffect();
  }

  private registerTocAndRouteSubscription() {
    // Subscribe to BehaviorSubject emitting the current (flattened) TOC
    // (the received TOC is already properly ordered) and to route
    // parameters, then act on changes to either.
    this.tocService.getCurrentFlattenedCollectionToc().pipe(
      filter(toc => this.ionViewActive() && !!toc),
      combineLatestWith(this.route.paramMap, this.route.queryParamMap),
      map(([toc, paramMap, queryParamMap]) => ({
        toc,
        collectionID: paramMap.get('collectionID'),
        publicationID: paramMap.get('publicationID'),
        chapterID: paramMap.get('chapterID'),
        position: queryParamMap.get('position')
      })),
      distinctUntilChanged((prev, curr) =>
        prev.toc.collectionId === curr.toc.collectionId &&
        prev.toc.order === curr.toc.order &&
        prev.collectionID === curr.collectionID &&
        prev.publicationID === curr.publicationID &&
        prev.chapterID === curr.chapterID &&
        prev.position === curr.position
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ toc, collectionID, publicationID, chapterID, position }) => {
      // Check that collectionID not nullish and matches id in TOC to proceed
      if (!collectionID || collectionID !== String(toc.collectionId)) {
        return;
      }

      this.textItemID.set(
        (publicationID && chapterID) ? `${collectionID}_${publicationID}_${chapterID}`
          : publicationID ? `${collectionID}_${publicationID}`
            : collectionID
      );
      this.tocItemId.set(position ? `${this.textItemID()};${position}` : this.textItemID());
      this.textPosition.set(position || '');

      if (this.collectionId() !== collectionID || this.activeMenuOrder() !== toc.order) {
        // A new TOC or changed ordering of current TOC:
        // concatenate front matter pages and TOC to form flattened TOC
        this.collectionId.set(collectionID);
        this.collectionTitle.set(toc.text || '');
        this.activeMenuOrder.set(toc.order || 'default');
        this.flattenedToc.set(this.getFrontmatterPages(collectionID, toc).concat(toc.children ?? []));
      }

      this.updateCurrentText();
    });
  }

  private registerIonViewActivationEffect() {
    let initialized = false;
    let previousActive = false;

    effect(() => {
      const active = this.ionViewActive();
      if (initialized && active && !previousActive) {
        // Update current text when the ionic view becomes active again.
        console.log('updating current text because ion view got active')
        untracked(() => this.updateCurrentText());
      }
      previousActive = active;
      initialized = true;
    });
  }


  // -----------------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------------
  private getFrontmatterPages(collectionId: string, toc: any) {
    type FrontMatterKey = 'cover' | 'title' | 'foreword' | 'introduction';
    const frontMatterKeys: FrontMatterKey[] = ['cover', 'title', 'foreword', 'introduction'];
    const localizedTexts: Record<FrontMatterKey, string> = {
      cover: toc.coverPageName || $localize`:@@CollectionCover.Cover:Omslag`,
      title: toc.titlePageName || $localize`:@@CollectionTitle.TitlePage:Titelblad`,
      foreword: toc.forewordPageName || $localize`:@@CollectionForeword.Foreword:Förord`,
      introduction: toc.introductionPageName || $localize`:@@CollectionIntroduction.Introduction:Inledning`
    };

    return frontMatterKeys.reduce<{ text: string; page: string; itemId: string }[]>((pages, key) => {
      if (enableFrontMatterPageOrTextViewType(key, collectionId, config)) {
        pages.push({
          text: localizedTexts[key],
          page: key,
          itemId: collectionId
        });
      }
      return pages;
    }, []);
  }

  /**
   * Updates the text that's displayed as the current text (as well as the
   * previous and next text), and sets the document title to the current
   * text title. If the current text is a positioned heading in a longer
   * text, the parent text title is set as the document title.
   */
  private updateCurrentText() {
    const pageType = this.parentPageType();
    const tocItems = this.flattenedToc();
    if (tocItems.length === 0) {
      return;
    }

    // Initially search for ToC item matching tocItemId, which includes position.
    // If not found, search for ToC item matching textItemId, which excludes
    // position.
    const tocItemIdIndex = this.getCurrentTextIndex(this.tocItemId(), pageType, tocItems);
    const textItemIdIndex = tocItemIdIndex < 0
      ? this.getCurrentTextIndex(this.textItemID(), pageType, tocItems)
      : -1;

    if (tocItemIdIndex > -1) {
      this.currentTocTextIndex.set(tocItemIdIndex);
    } else if (textItemIdIndex > -1) {
      this.currentTocTextIndex.set(textItemIdIndex);
    } else {
      console.error('Unable to find the current text in flattenedTOC in text-changer component.');
      this.currentTocTextIndex.set(0);
    }

    // Set the document title to the current text title.
    // Positioned item's title should not be set. Instead, if not a frontmatter
    // page ("page" key missing), we have to search for the non-positioned
    // item's title.
    const titleItemIndex = this.textPosition() && pageType === 'text'
      ? (textItemIdIndex < 0
        ? this.getCurrentTextIndex(this.textItemID(), pageType, tocItems)
        : textItemIdIndex)
      : this.currentTocTextIndex();

    const itemTitle = titleItemIndex > -1
      ? tocItems[titleItemIndex].text || ''
      : tocItems[this.currentTocTextIndex()].text || '';

    this.headService.setTitle([itemTitle, this.collectionTitle()]);
  }

  private getCurrentTextIndex(searchItemId: string, pageType: string, tocItems: any[]): number {
    return tocItems.findIndex(item => {
      if (!item.page && item.itemId === searchItemId) {
        return true;
      }
      return item.page === pageType;
    });
  }
}
