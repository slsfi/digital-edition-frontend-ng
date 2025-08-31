import { Component, ElementRef, NgZone, OnDestroy, OnInit, Renderer2, inject, output, input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';

import { IllustrationModal } from '@modals/illustration/illustration.modal';
import { TextKey } from '@models/collection.model';
import { CorrespondenceMetadata, CorrespondentData, LetterData } from '@models/metadata.model';
import { TrustHtmlPipe } from '@pipes/trust-html.pipe';
import { CommentService } from '@services/comment.service';
import { HtmlParserService } from '@services/html-parser.service';
import { PlatformService } from '@services/platform.service';
import { ScrollService } from '@services/scroll.service';
import { ViewOptionsService } from '@services/view-options.service';
import { concatenateNames, isBrowser } from '@utility-functions';


@Component({
  selector: 'comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss'],
  imports: [IonicModule, TrustHtmlPipe]
})
export class CommentsComponent implements OnInit, OnDestroy {
  private commentService = inject(CommentService);
  private elementRef = inject(ElementRef);
  private modalController = inject(ModalController);
  private ngZone = inject(NgZone);
  private parserService = inject(HtmlParserService);
  private platformService = inject(PlatformService);
  private renderer2 = inject(Renderer2);
  private scrollService = inject(ScrollService);
  viewOptionsService = inject(ViewOptionsService);

  readonly searchMatches = input<string[]>([]);
  readonly textKey = input.required<TextKey>();
  readonly openNewReadingTextView = output<string>();
  readonly setMobileModeActiveText = output<string>();

  intervalTimerId: number = 0;
  letter?: LetterData = undefined;
  manuscript: any = undefined;
  mobileMode: boolean = true;
  receiver: string = '';
  sender: string = '';
  text: string = '';

  private unlistenClickEvents?: () => void;

  ngOnInit() {
    this.mobileMode = this.platformService.isMobile();

    const textKey = this.textKey();
    this.loadCommentsText(textKey);
    this.getCorrespondanceMetadata(textKey);

    if (isBrowser()) {
      this.setUpTextListeners();
    }
  }

  ngOnDestroy() {
    this.unlistenClickEvents?.();
  }

  loadCommentsText(textKey: TextKey) {
    this.commentService.getComments(textKey).subscribe({
      next: (text) => {
        if (text && String(text) !== 'File not found') {
          this.text = this.parserService.insertSearchMatchTags(String(text), this.searchMatches());
          if (this.searchMatches().length) {
            this.scrollService.scrollToFirstSearchMatch(this.elementRef.nativeElement, this.intervalTimerId);
          }
        } else {
          this.text = $localize`:@@Commentary.None:Inga kommentarer.`;
        }
      },
      error: (e) =>  {
        console.error(e);
        this.text = $localize`:@@Commentary.Error:Ett fel har uppstått. Kommentarer kunde inte hämtas.`;
      }
    });
  }

  getCorrespondanceMetadata(textKey: TextKey) {
    this.commentService.getCorrespondanceMetadata(textKey.publicationID).subscribe(
      (cm: CorrespondenceMetadata | null) => {
        if (cm === null) {
          return;
        }
        if (cm.subjects?.length > 0) {
          const senders: string[] = [];
          const receivers: string[] = [];
          cm.subjects.forEach((subject: CorrespondentData) => {
            if (subject.sender) {
              senders.push(subject.sender);
            }
            if (subject.receiver) {
              receivers.push(subject.receiver);
            }
          });
          this.sender = concatenateNames(senders);
          this.receiver = concatenateNames(receivers);
        }

        if (cm.letter) {
          this.letter = cm.letter;
        }
      }
    );
  }

  private setUpTextListeners() {
    const nElement: HTMLElement = this.elementRef.nativeElement;

    this.ngZone.runOutsideAngular(() => {

      /* CLICK EVENTS */
      this.unlistenClickEvents = this.renderer2.listen(nElement, 'click', (event) => {
        try {
          // This check for xreference is necessary since we don't want the comment to
          // scroll if the clicked target is a link in a comment. Clicks on links are
          // handled by read.ts.
          let targetIsLink = false;
          let targetElem: HTMLElement | null = event.target as HTMLElement;

          if (
            targetElem.classList.contains('xreference') ||
            (
              targetElem.parentElement !== null &&
              targetElem.parentElement.classList.contains('xreference')
            ) ||
            (
              targetElem.parentElement?.parentElement !== null &&
              targetElem.parentElement?.parentElement.classList.contains('xreference')
            )
          ) {
            targetIsLink = true;
          }

          if (!targetIsLink && this.viewOptionsService.show.comments) {
            // This is linking to a comment lemma ("asterisk") in the reading text,
            // i.e. the user has clicked a comment in the comments-column.
            event.preventDefault();

            // Find the comment element that has been clicked in the comment-column.
            if (!targetElem.classList.contains('commentScrollTarget')) {
              targetElem = targetElem.parentElement;
              while (
                targetElem !== null &&
                !targetElem.classList.contains('commentScrollTarget') &&
                targetElem.tagName !== 'COMMENTS'
              ) {
                targetElem = targetElem.parentElement;
              }
            }
            if (targetElem) {
              // Find the lemma in the reading text.
              // Remove all non-digits at the start of the comment's id.
              const numId: string = targetElem.classList[targetElem.classList.length - 1]
                    .replace( /^\D+/g, '');
              const targetId: string = 'start' + numId;
              const lemmaStart = this.scrollService.findElementInColumnByAttribute('data-id', targetId, 'reading-text');

              if (lemmaStart) {
                // There is a reading text view open.
                // Scroll to start of lemma in reading text and temporarily prepend arrow.
                if (this.mobileMode) {
                  this.setMobileModeActiveText.emit('readingtext');
                  // In mobile mode the reading text view needs time to be made
                  // visible before scrolling can start.
                  setTimeout(() => {
                    this.scrollService.scrollToCommentLemma(lemmaStart);
                  }, 700);
                } else {
                  this.scrollService.scrollToCommentLemma(lemmaStart);
                  // Scroll to comment in the comments-column.
                  this.scrollService.scrollToComment(numId, targetElem);
                }
              } else {
                // A reading text view is not open -> open one so the lemma can be scrolled
                // into view there.
                this.ngZone.run(() => {
                  this.openNewReadingTextView.emit(targetId);
                });
                // Scroll to comment in the comments-column.
                this.scrollService.scrollToComment(numId, targetElem);
              }
            }
          }

          // Check if click on a link to an illustration that should be opened in a modal
          if (targetIsLink && targetElem?.classList.contains('ref_illustration')) {
            const imageNumber = (targetElem as HTMLAnchorElement).hash.split('#')[1];
            this.ngZone.run(() => {
              this.openIllustration(imageNumber);
            });
          }
        } catch (e) {}
      });

    });
  }

  async openIllustration(imageNumber: string) {
    const modal = await this.modalController.create({
      component: IllustrationModal,
      componentProps: { 'imageNumber': imageNumber }
    });
    modal.present();
  }

}
