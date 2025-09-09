import { ChangeDetectionStrategy, Component, DestroyRef, Injector, NgZone, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { catchError, of, switchMap, tap } from 'rxjs';

import { FullscreenImageViewerModal } from '@modals/fullscreen-image-viewer/fullscreen-image-viewer.modal';
import { TextKey } from '@models/collection.models';
import { Illustration } from '@models/illustration.models';
import { HtmlParserService } from '@services/html-parser.service';
import { PlatformService } from '@services/platform.service';
import { ScrollService } from '@services/scroll.service';


@Component({
  selector: 'illustrations',
  templateUrl: './illustrations.component.html',
  styleUrls: ['./illustrations.component.scss'],
  imports: [NgClass, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IllustrationsComponent {
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private modalCtrl = inject(ModalController);
  private ngZone = inject(NgZone);
  private parserService = inject(HtmlParserService);
  private platformService = inject(PlatformService);
  private scrollService = inject(ScrollService);

  readonly singleImage = input<Illustration | undefined>();
  readonly textKey = input.required<TextKey>();
  readonly showAllImages = output<null>();
  readonly setMobileModeActiveText = output<string>();
  
  imgLoading = signal(true);
  viewAll = signal(true);
  images = signal<Illustration[]>([]);
  imagesCache = signal<Illustration[]>([]);
  selectedImage = signal<string[]>([]);

  mobileMode = this.platformService.isMobile();

  imageCountTotal = computed(() => this.imagesCache().length);


  constructor() {
    toObservable(this.textKey).pipe(
      // reset state before each load
      tap(() => {
        this.imgLoading.set(true);
        this.viewAll.set(true);
        this.images.set([]);
        this.imagesCache.set([]);
      }),
      switchMap(tk =>
        this.parserService.getReadingTextIllustrations(tk).pipe(
          catchError(err => {
            // don’t fail the stream; render “no images” instead
            console.error(err);
            return of([] as Illustration[]);
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((imgs: Illustration[]) => {
      this.imagesCache.set(imgs);

      const single = this.singleImage();
      if (single && imgs.length > 0) {
        this.images.set([single]);
        this.viewAll.set(false);
      } else {
        this.images.set(imgs);
        this.viewAll.set(true);
      }

      this.imgLoading.set(false);
    });

    // still react to late singleImage() changes
    effect(() => {
      const single = this.singleImage();
      if (single) {
        this.images.set([single]);
        this.viewAll.set(false);
      }
    }, { injector: this.injector });
  }

  // UI actions
  showSingleImage(image: Illustration) {
    if (image) {
      this.viewAll.set(false);
      this.images.set([image]);
    } else {
      this.viewAllIllustrations();
    }
  }

  viewAllIllustrations() {
    this.viewAll.set(true);
    this.images.set(this.imagesCache());
    this.showAllImages.emit(null);
  }

  async zoomImage(imageSrc: string) {
    this.selectedImage.set([imageSrc]);
    const params = {
      activeImageIndex: 0,
      imageURLs: this.selectedImage(),
    };

    const modal = await this.modalCtrl.create({
      component: FullscreenImageViewerModal,
      componentProps: params,
      cssClass: 'fullscreen-image-viewer-modal',
    });

    modal.present();
  }

  scrollToPositionInText(image: Illustration) {
    const imageSrc = image.src;
    if (!imageSrc) {
      console.log('Empty src-attribute for image, unable to scroll to position in text.');
      return;
    }

    const imageFilename = imageSrc.substring(imageSrc.lastIndexOf('/') + 1);
    const readtextElem = document.querySelector(
      'page-text:not([ion-page-hidden]):not(.ion-page-hidden) reading-text'
    ) as HTMLElement | null;

    try {
      let target: HTMLElement | null | undefined = null;

      if (image.class === 'doodle') {
        // data-id strategy for pictograms
        // Get the image filename without format and prepend tag_ to it
        let imageDataId = 'tag_' + imageFilename.substring(0, imageFilename.lastIndexOf('.'));
        target = readtextElem?.querySelector<HTMLElement>(`img.doodle[data-id="${imageDataId}"]`);
        
        if (!target) {
          // Try dropping the prefix 'tag_' from image data-id as
          // unknown pictograms don't have this
          imageDataId = imageDataId.replace('tag_', '');
          target = readtextElem?.querySelector<HTMLElement>(`img.doodle[data-id="${imageDataId}"]`);
        }

        if (target?.previousElementSibling?.previousElementSibling?.classList.contains('ttNormalisations')) {
          // Change the scroll target from the doodle icon itself to
          // the preceding word which the icon represents.
          target = target.previousElementSibling!.previousElementSibling as HTMLElement;
        } else if (target?.parentElement?.classList.contains('ttNormalisations')) {
          target = target.parentElement as HTMLElement;
        }
      } else {
        // Inline illustration: match by filename suffix.
        // Get the image element with src-attribute value
        // ending in image filename
        const imageSrcFilename = '/' + imageFilename;
        target = readtextElem?.querySelector<HTMLElement>(`[src$="${imageSrcFilename}"]`);
      }

      if (!target?.parentElement) {
        console.log('Unable to find target when scrolling to image position in text, imageSrc:', imageSrc);
        return;
      }

      // Switch active view to reading text (mobile flow relies on a delay)
      this.setMobileModeActiveText.emit('readingtext');

      if (image.class !== 'visible-illustration') {
        // Prepend temporary arrow near the target, then scroll to it
        const tmpImage: HTMLImageElement = new Image();
        tmpImage.src = 'assets/images/ms_arrow_right.svg';
        tmpImage.alt = 'ms arrow right image';
        tmpImage.classList.add('inl_ms_arrow');
        target.parentElement.insertBefore(tmpImage, target);

        const doScroll = () => this.scrollService.scrollElementIntoView(tmpImage);
        if (this.mobileMode) {
          this.ngZone.runOutsideAngular(() => setTimeout(doScroll, 700));
        } else {
          this.ngZone.runOutsideAngular(doScroll);
        }
        // Remove prepended arrow after a while
        setTimeout(() => {
          try {
            target?.parentElement?.removeChild(tmpImage);
          } catch {}
        }, 5000);
      } else {
        // Visible inline illustration: scroll to target itself
        const doScroll = () => this.scrollService.scrollElementIntoView(target, 'top', this.mobileMode ? 0 : 75);
        if (this.mobileMode) {
          // In mobile mode the reading text view needs to be made
          // visible before scrolling can start.
          this.ngZone.runOutsideAngular(() => setTimeout(doScroll, 700));
        } else {
          this.ngZone.runOutsideAngular(doScroll);
        }
      }
    } catch {
      console.log('Error scrolling to image position in text.');
    }
  }
}
