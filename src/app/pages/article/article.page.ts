import { Component, ElementRef, LOCALE_ID, NgZone, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, PopoverController } from '@ionic/angular';
import { Observable, Subscription, switchMap, tap } from 'rxjs';

import { config } from '@config';
import { ReferenceDataModal } from '@modals/reference-data/reference-data.modal';
import { Article } from '@models/article.model';
import { Textsize } from '@models/textsize.model';
import { ViewOptionsPopover } from '@popovers/view-options/view-options.popover';
import { MarkdownService } from '@services/markdown.service';
import { PlatformService } from '@services/platform.service';
import { ScrollService } from '@services/scroll.service';
import { ViewOptionsService } from '@services/view-options.service';
import { isBrowser } from '@utility-functions';


@Component({
  selector: 'page-article',
  templateUrl: './article.page.html',
  styleUrls: ['./article.page.scss'],
  standalone: false
})
export class ArticlePage implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private mdService = inject(MarkdownService);
  private modalController = inject(ModalController);
  private ngZone = inject(NgZone);
  private platformService = inject(PlatformService);
  private popoverCtrl = inject(PopoverController);
  private renderer2 = inject(Renderer2);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scrollService = inject(ScrollService);
  viewOptionsService = inject(ViewOptionsService);
  private activeLocale = inject(LOCALE_ID);

  article: Article | null = null;
  enableTOC: boolean = true;
  markdownText$: Observable<string | null>;
  mobileMode: boolean = false;
  showTextDownloadButton: boolean = false;
  showURNButton: boolean = true;
  textsize: Textsize = Textsize.Small;
  textsizeSubscription: Subscription | null = null;
  tocMenuOpen: boolean = true;

  TextsizeEnum = Textsize;

  private fragmentSubscription?: Subscription;
  private unlistenClickEvents?: () => void;

  constructor() {
    this.showTextDownloadButton = config.page?.article?.showTextDownloadButton ?? true;
    this.showURNButton = config.page?.article?.showURNButton ?? true;
  }

  ngOnInit() {
    this.mobileMode = this.platformService.isMobile();

    this.textsizeSubscription = this.viewOptionsService.getTextsize().subscribe(
      (textsize: Textsize) => {
        this.textsize = textsize;
      }
    );

    if (isBrowser()) {
      this.setUpTextListeners();

      this.fragmentSubscription = this.route.fragment.subscribe(fragment => {
        if (fragment) {
          this.scrollToFragment(fragment);
        }
      });
    }

    this.markdownText$ = this.route.params.pipe(
      tap(({name}) => {
        this.article = config.articles?.find(
          (article: Article) => (article.routeName === name) && article.language === this.activeLocale
        ) ?? null;
        this.enableTOC = this.article?.enableTOC ?? true;
      }),
      switchMap(({name}) => {
        const id = this.article?.id ?? name;

        return this.mdService.getParsedMdContent(
          this.activeLocale + '-' + id,
          '<p>' + $localize`:@@Article.LoadingError:Artikeln kunde inte laddas.` + '</p>'
        );
      })
    );
  }

  ngOnDestroy() {
    this.unlistenClickEvents?.();
    this.fragmentSubscription?.unsubscribe();
    this.textsizeSubscription?.unsubscribe();
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
    // Get URL of Page and then the URI
    const modal = await this.modalController.create({
      component: ReferenceDataModal,
      componentProps: { origin: 'page-article' }
    });

    modal.present();
  }

  toggleTocMenu() {
    this.tocMenuOpen = !this.tocMenuOpen;
  }

  /**
   * Listen for click events so we can intercept clicks on fragment links to
   * positions on the same page, and smoothly scroll the position into view.
   */
  private setUpTextListeners() {
    const nElement: HTMLElement = this.elementRef.nativeElement;

    this.ngZone.runOutsideAngular(() => {
      /* CLICK EVENTS */
      this.unlistenClickEvents = this.renderer2.listen(nElement, 'click', (event) => {
        try {
          const eventTarget = event.target as HTMLElement;
          if (
            eventTarget.hasAttribute('href') &&
            eventTarget.getAttribute('href')?.startsWith('#')
          ) {
            // Link to a position on the same page, find the link target
            // and scroll the position into view using the URL fragment.
            event.preventDefault();
            const targetElemId = eventTarget.getAttribute('href')?.slice(1);
            if (!targetElemId) {
              return;
            }

            this.router.navigate([], {
              fragment: targetElemId,
              queryParamsHandling: 'preserve',
              relativeTo: this.route,
              replaceUrl: false,
            });
          }
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  private scrollToFragment(targetElemId: string, delayMs: number = 500) {
    if (!isBrowser()) return;
  
    this.ngZone.runOutsideAngular(() => {
      let attemptsLeft = 10;
  
      const tryScroll = () => {
        if (attemptsLeft-- < 1) return;
  
        const scrollTargetElem = document.querySelector<HTMLElement>(
          'page-article:not([ion-page-hidden]):not(.ion-page-hidden) [id="' + targetElemId + '"]'
        );
        const scrollContainerElem = document.querySelector<HTMLElement>(
          'page-article:not([ion-page-hidden]):not(.ion-page-hidden) article'
        );
  
        if (scrollTargetElem && scrollContainerElem) {
          this.scrollService.scrollElementIntoView(
            scrollTargetElem, 'top', 0, 'smooth', scrollContainerElem
          );

          // If scrolling to footnote or footnote reference, move focus so navigating
          // back and forth with keyboard works.
          const targetElemAttr = scrollTargetElem.getAttribute('id');
          let focusElem = null;

          if (targetElemAttr?.startsWith('md-footnote-ref-')) {
            focusElem = scrollTargetElem;
          } else if (targetElemAttr?.startsWith('md-footnote-')) {
            focusElem = scrollTargetElem.querySelector<HTMLElement>('[data-md-footnote-backref]');
          }

          focusElem?.focus({ preventScroll: true });
        } else {
          setTimeout(tryScroll, delayMs);
        }
      };
  
      tryScroll();
    });
  }
  
}
