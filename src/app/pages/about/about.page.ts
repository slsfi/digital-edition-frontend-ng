import { Component, Inject, LOCALE_ID, OnInit } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Observable, switchMap } from 'rxjs';

import { MarkdownContentService } from '@services/markdown-content.service';


@Component({
  selector: 'page-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss']
})
export class AboutPage implements OnInit {
  markdownText$: Observable<SafeHtml>;

  constructor(
    private mdContentService: MarkdownContentService,
    private route: ActivatedRoute,
    @Inject(LOCALE_ID) private activeLocale: string
  ) {}

  ngOnInit() {
    this.markdownText$ = this.route.params.pipe(
      switchMap(({id}) => {
        return this.mdContentService.getParsedMdContentFromFileID(
          this.activeLocale + '-' + id,
          $localize`:@@About.LoadingError:Sidans innehåll kunde inte laddas.`
        );
      })
    );
  }

}
