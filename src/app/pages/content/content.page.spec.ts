import type { MockedObject } from 'vitest';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { MarkdownService } from '@services/markdown.service';
import { ContentPage } from './content.page';

describe('ContentPage', () => {
  it('renders asynchronous Markdown updates without a manual change-detection pass', async () => {
    const markdown$ = new BehaviorSubject<string | null>('<p>Initial content</p>');
    const markdownService: MockedObject<Pick<MarkdownService, 'getParsedMdContent'>> = {
      getParsedMdContent: vi.fn().mockName('MarkdownService.getParsedMdContent')
    };
    markdownService.getParsedMdContent.mockReturnValue(markdown$);

    await TestBed.configureTestingModule({
      imports: [ContentPage],
      providers: [
        { provide: LOCALE_ID, useValue: 'sv' },
        { provide: MarkdownService, useValue: markdownService }
      ]
    })
      .overrideTemplate(ContentPage, '{{ mdContent$ | async }}')
      .compileComponents();

    const fixture = TestBed.createComponent(ContentPage);
    fixture.detectChanges();
    expect(markdownService.getParsedMdContent).toHaveBeenCalledTimes(1);
    expect(markdownService.getParsedMdContent).toHaveBeenCalledWith('sv-02');
    expect(fixture.nativeElement.textContent).toContain('Initial content');

    markdown$.next('<p>Updated content</p>');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Updated content');
  });
});
