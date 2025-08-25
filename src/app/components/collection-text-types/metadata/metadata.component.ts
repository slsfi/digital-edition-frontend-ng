import { Component, LOCALE_ID, OnInit, inject, input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { catchError, Observable, of, Subject } from 'rxjs';

import { CollectionContentService } from '@services/collection-content.service';


@Component({
  selector: 'text-metadata',
  templateUrl: './metadata.component.html',
  styleUrls: ['./metadata.component.scss'],
  imports: [AsyncPipe, IonicModule]
})
export class MetadataComponent implements OnInit {
  private collectionContentService = inject(CollectionContentService);
  private activeLocale = inject(LOCALE_ID);

  readonly publicationID = input.required<string>();

  loadingError$: Subject<boolean> = new Subject<boolean>();
  metadata$: Observable<any>;

  ngOnInit() {
    this.metadata$ = this.collectionContentService.getMetadata(
      this.publicationID(), this.activeLocale
    ).pipe(
      catchError((error) => {
        console.error('Error loading metadata', error);
        this.loadingError$.next(true);
        return of();
      })
    );
  }

}
