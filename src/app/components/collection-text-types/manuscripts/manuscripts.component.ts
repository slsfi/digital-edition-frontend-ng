import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterRenderEffect, computed, effect, inject, input, output, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { AlertButton, AlertController, AlertInput, IonicModule } from '@ionic/angular';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap } from 'rxjs';

import { config } from '@config';
import { TextKey } from '@models/collection.model';
import { TrustHtmlPipe } from '@pipes/trust-html.pipe';
import { CollectionContentService } from '@services/collection-content.service';
import { HtmlParserService } from '@services/html-parser.service';
import { ScrollService } from '@services/scroll.service';
import { ViewOptionsService } from '@services/view-options.service';


@Component({
  selector: 'manuscripts',
  templateUrl: './manuscripts.component.html',
  styleUrls: ['./manuscripts.component.scss'],
  imports: [AsyncPipe, IonicModule, TrustHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManuscriptsComponent {
  private alertCtrl = inject(AlertController);
  private collectionContentService = inject(CollectionContentService);
  private destroyRef = inject(DestroyRef);
  private elementRef = inject(ElementRef);
  private injector = inject(Injector);
  private parserService = inject(HtmlParserService);
  private scrollService = inject(ScrollService);
  viewOptionsService = inject(ViewOptionsService);

  readonly msID = input<number>();
  readonly searchMatches = input<string[]>([]);
  readonly textKey = input.required<TextKey>();
  readonly openNewLegendView = output<any>();
  readonly selectedMsID = output<number>();
  readonly selectedMsName = output<string>();

  readonly showNormalizedToggle: boolean = config.component?.manuscripts?.showNormalizedToggle ?? true;
  readonly showOpenLegendButton: boolean = config.component?.manuscripts?.showOpenLegendButton ?? false;
  readonly showTitle: boolean = config.component?.manuscripts?.showTitle ?? true;

  private _lastScrollKey: string | null = null;
  intervalTimerId: number = 0;

  // local signals
  private showNormalizedMs = signal(false);
  manuscripts = signal<any[] | null>(null);
  private pickedMsId = signal<number | undefined>(undefined);
  private statusMessage = signal<string | null>(null);

  // selection derived from signals
  selectedManuscript = computed(() => {
    const list = this.manuscripts();
    if (!list || list.length === 0) {
      return undefined;
    }
    const id = this.pickedMsId() ?? this.msID();
    return list.find(m => m.id === id) ?? list[0];
  });

  textLanguage = computed(() => this.selectedManuscript()?.language ?? '');

  // load manuscripts when input signal changes
  constructor() {
    toObservable(this.textKey).pipe(
      tap(() => {
        // start a new load
        this.manuscripts.set(null);
        this.statusMessage.set(null);
        this.pickedMsId.set(undefined); // optional: reset selection on textKey change
        this._lastScrollKey = null;
      }),
      switchMap((tk: TextKey) =>
        this.collectionContentService.getManuscripts(tk).pipe(
          map(res => res?.manuscripts?.filter((m: any) => !!m?.manuscript_changes) ?? []),
          catchError(err => {
            console.error(err);
            this.statusMessage.set($localize`:@@Manuscripts.Error:Ett fel har uppstått. Manuskript kunde inte hämtas.`);
            return of([] as any[]);
          })
        )
      ),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(list => {
      this.manuscripts.set(list);
      // If loaded but empty, show "None" message (unless an error already set one)
      if (list.length === 0 && !this.statusMessage()) {
        this.statusMessage.set($localize`:@@Manuscripts.None:Inga manuskriptutskrifter.`);
      }
    });

    // emit outputs when selection changes (only meaningful if >1 item)
    effect(() => {
      const list = this.manuscripts();
      const m = this.selectedManuscript();
      if (Array.isArray(list) && list.length > 1 && m) {
        this.selectedMsID.emit(m.id);
        this.selectedMsName.emit(m.name);
      }
    });

    afterRenderEffect({
      write: () => {
        const ms = this.manuscripts();         // any[] | null
        const matches = this.searchMatches();  // string[]
        const tk = this.textKey();             // TextKey

        // only after data finished loading and we have matches
        if (!Array.isArray(ms) || ms.length === 0) return;
        if (matches.length === 0) return;

        // de-dupe: key does NOT include manuscript id → won’t re-scroll on manual change
        const key = `${tk.textItemID}|${matches.join(',')}`;
        if (this._lastScrollKey === key) return;
        this._lastScrollKey = key;

        this.scrollService.scrollToFirstSearchMatch(
          this.elementRef.nativeElement,
          this.intervalTimerId
        );
      }
    }, { injector: this.injector });

  }

  // build final HTML as a computed signal
  private html = computed(() => {
    // Show status message (none/error) when present
    const message = this.statusMessage();
    if (message) {
      return message;
    }

    // While loading, return undefined → spinner in template
    const list = this.manuscripts();
    if (list === null) {
      return undefined;
    }

    const m = this.selectedManuscript();
    if (!m) {
      return ''; // defensive (should be covered by message above)
    }

    const raw = this.showNormalizedMs()
          ? m.manuscript_normalized
          : m.manuscript_changes;
    const post = this.parserService.postprocessManuscriptText(raw);
    return this.parserService.insertSearchMatchTags(post, this.searchMatches());
  });

  // and expose it as an Observable for the template
  text$ = toObservable(this.html);

  // UI actions
  toggleNormalizedManuscript() {
    this.showNormalizedMs.update(v => !v);
  }

  selectManuscriptById(id: number) {
    this.pickedMsId.set(id);
  }

  async selectManuscript() {
    const list = this.manuscripts();
    if (!Array.isArray(list) || list.length === 0) {
      return;
    }

    const currentId = this.selectedManuscript()?.id;

    // Ion Alert radio values are strings; convert on read for safety.
    const inputs: AlertInput[] = list.map((m: any) => ({
      type: 'radio',
      label: m.name,
      value: String(m.id),
      checked: m.id === currentId
    }));

    const buttons: AlertButton[] = [
      { text: $localize`:@@BasicActions.Cancel:Avbryt` },
      {
        text: $localize`:@@BasicActions.Ok:Ok`,
        handler: (value: string) => {
          const id = Number(value);
          if (!Number.isNaN(id)) {
            this.selectManuscriptById(id);
          }
        }
      }
    ];

    const alert = await this.alertCtrl.create({
      header: $localize`:@@Manuscripts.SelectMsDialogTitle:Välj manuskript`,
      subHeader: $localize`:@@Manuscripts.SelectMsDialogSubtitle:Manuskriptet ersätter det manuskript som visas i kolumnen där du klickade.`,
      cssClass: 'custom-select-alert',
      inputs,
      buttons
    });

    await alert.present();
  }

  openNewLegend(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const id = {
      viewType: 'legend',
      id: 'ms-legend'
    }
    this.openNewLegendView.emit(id);
  }

}
