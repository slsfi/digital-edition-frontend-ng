import { Component, ElementRef, Inject, LOCALE_ID, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, switchMap } from 'rxjs';

import { MarkdownService } from '@services/markdown.service';
import { ScrollService } from '@services/scroll.service';
import { isBrowser } from '@utility-functions';


@Component({
    selector: 'page-about',
    templateUrl: './about.page.html',
    styleUrls: ['./about.page.scss'],
    standalone: false
})
export class AboutPage implements OnInit, OnDestroy {
  markdownText$: Observable<string | null>;

  private unlistenClickEvents?: () => void;

  constructor(
    private elementRef: ElementRef,
    private mdService: MarkdownService,
    private ngZone: NgZone,
    private renderer2: Renderer2,
    private route: ActivatedRoute,
    private scrollService: ScrollService,
    @Inject(LOCALE_ID) private activeLocale: string
  ) {}

  ngOnInit() {
    if (isBrowser()) {
      this.setUpTextListeners();
    }

    this.markdownText$ = this.route.params.pipe(
      switchMap(({id}) => {
        return this.mdService.getParsedMdContent(
          this.activeLocale + '-' + id,
          '<p>' + $localize`:@@About.LoadingError:Sidans innehåll kunde inte laddas.` + '</p>'
        );
      })
    );
  }

  ngOnDestroy() {
    this.unlistenClickEvents?.();
  }

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
            // and scroll the position into view.
            event.preventDefault();
            const targetElemId = eventTarget.getAttribute('href')?.slice(1);
            if (!targetElemId) {
              return;
            }

            const scrollTargetElem = document.querySelector(
              'page-about:not([ion-page-hidden]):not(.ion-page-hidden) [id="' + targetElemId + '"]'
            );
            const scrollContainerElem = document.querySelector(
              'page-about:not([ion-page-hidden]):not(.ion-page-hidden) ion-content'
            )?.shadowRoot?.querySelector('[part="scroll"]');
            if (!scrollTargetElem || !scrollContainerElem) {
              return;
            }

            this.scrollService.scrollElementIntoView(
              scrollTargetElem as HTMLElement, 'top', 20, 'smooth', scrollContainerElem as HTMLElement
            );
          }
        } catch (e) {
          console.error(e);
        }
      });
    });
  }
}
