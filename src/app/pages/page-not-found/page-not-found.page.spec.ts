import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { MarkdownService } from '@services/markdown.service';
import { PageNotFoundPage } from './page-not-found.page';

describe('PageNotFoundPage', () => {
  it('renders asynchronous Markdown updates without a manual change-detection pass', async () => {
    const markdown$ = new BehaviorSubject<string | null>('<p>Not found</p>');
    const markdownService = jasmine.createSpyObj<MarkdownService>(
      'MarkdownService',
      ['getParsedMdContent']
    );
    markdownService.getParsedMdContent.and.returnValue(markdown$);

    await TestBed.configureTestingModule({
      imports: [PageNotFoundPage],
      providers: [
        { provide: LOCALE_ID, useValue: 'sv' },
        { provide: MarkdownService, useValue: markdownService }
      ]
    })
      .overrideTemplate(PageNotFoundPage, '{{ markdownText$ | async }}')
      .compileComponents();

    const fixture = TestBed.createComponent(PageNotFoundPage);
    fixture.detectChanges();
    expect(markdownService.getParsedMdContent).toHaveBeenCalledWith(
      'sv-404',
      jasmine.any(String)
    );
    expect(fixture.nativeElement.textContent).toContain('Not found');

    markdown$.next('<p>Still not found</p>');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Still not found');
  });
});
