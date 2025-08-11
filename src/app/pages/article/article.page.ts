import { Component, ElementRef, Inject, LOCALE_ID, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Observable, Subscription, switchMap } from 'rxjs';

import { config } from '@config';
import { ReferenceDataModal } from '@modals/reference-data/reference-data.modal';
import { MarkdownService } from '@services/markdown.service';
import { PlatformService } from '@services/platform.service';
import { ScrollService } from '@services/scroll.service';
import { isBrowser } from '@utility-functions';


@Component({
  selector: 'page-article',
  templateUrl: './article.page.html',
  styleUrls: ['./article.page.scss'],
  standalone: false
})
export class ArticlePage implements OnInit, OnDestroy {
  markdownText$: Observable<string | null>;
  mobileMode: boolean = false;
  tocMenuOpen: boolean = true;

  private fragmentSubscription?: Subscription;
  private unlistenClickEvents?: () => void;

  constructor(
    private elementRef: ElementRef,
    private mdService: MarkdownService,
    private modalController: ModalController,
    private ngZone: NgZone,
    private platformService: PlatformService,
    private renderer2: Renderer2,
    private route: ActivatedRoute,
    private router: Router,
    private scrollService: ScrollService,
    @Inject(LOCALE_ID) private activeLocale: string
  ) {}

  ngOnInit() {
    this.mobileMode = this.platformService.isMobile();
    if (isBrowser()) {
      this.setUpTextListeners();

      this.fragmentSubscription = this.route.fragment.subscribe(fragment => {
        if (fragment) {
          this.scrollToFragment(fragment);
        }
      });
    }

    this.markdownText$ = this.route.params.pipe(
      switchMap(({name}) => {
        const article = config.articles?.find((article: any) => article.routeName === name) ?? null;
        const id = article?.id ?? name;

        return this.mdService.getParsedMdContent(
          this.activeLocale + '-' + id,
          '<p>' + $localize`:@@About.LoadingError:Sidans innehåll kunde inte laddas.` + '</p>'
        );
      })
    );
  }

  ngOnDestroy() {
    this.unlistenClickEvents?.();
    this.fragmentSubscription?.unsubscribe();
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
  
        const scrollTargetElem = document.querySelector(
          'page-article:not([ion-page-hidden]):not(.ion-page-hidden) [id="' + targetElemId + '"]'
        );
        const scrollContainerElem = document.querySelector(
          'page-article:not([ion-page-hidden]):not(.ion-page-hidden) article'
        );
  
        if (scrollTargetElem && scrollContainerElem) {
          this.scrollService.scrollElementIntoView(
            scrollTargetElem as HTMLElement, 'top', 0, 'smooth', scrollContainerElem as HTMLElement
          );
        } else {
          setTimeout(tryScroll, delayMs);
        }
      };
  
      tryScroll();
    });
  }
  
}
