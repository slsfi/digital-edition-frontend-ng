import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Data, Params, Router } from '@angular/router';
import { BehaviorSubject, EMPTY, of } from 'rxjs';

import { MarkdownService } from '@services/markdown.service';
import { ScrollService } from '@services/scroll.service';
import { AboutPage } from './about.page';

describe('AboutPage', () => {
  it('loads the page ID from parent route data and reacts to route changes', async () => {
    const params = new BehaviorSubject<Params>({});
    const routeData = new BehaviorSubject<Data>({});
    const parentRouteData = new BehaviorSubject<Data>({ backendPageId: '05-01' });
    const markdownService = jasmine.createSpyObj<MarkdownService>(
      'MarkdownService',
      ['getParsedMdContent']
    );
    markdownService.getParsedMdContent.and.callFake((fileId: string) => of(`<p>${fileId}</p>`));

    await TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [
        { provide: LOCALE_ID, useValue: 'sv' },
        {
          provide: ActivatedRoute,
          useValue: {
            params,
            data: routeData,
            fragment: EMPTY,
            parent: { data: parentRouteData }
          }
        },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: MarkdownService, useValue: markdownService },
        {
          provide: ScrollService,
          useValue: jasmine.createSpyObj<ScrollService>('ScrollService', ['scrollElementIntoView'])
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AboutPage);
    const component = fixture.componentInstance;
    const renderedMarkdown: Array<string | null> = [];

    component.ngOnInit();
    const subscription = component.markdownText$.subscribe((value) => renderedMarkdown.push(value));

    expect(markdownService.getParsedMdContent).toHaveBeenCalledWith(
      'sv-05-01',
      jasmine.any(String)
    );
    expect(renderedMarkdown.at(-1)).toBe('<p>sv-05-01</p>');

    parentRouteData.next({ backendPageId: '05-02' });
    expect(markdownService.getParsedMdContent).toHaveBeenCalledWith(
      'sv-05-02',
      jasmine.any(String)
    );
    expect(renderedMarkdown.at(-1)).toBe('<p>sv-05-02</p>');

    params.next({ id: '03-01' });
    expect(markdownService.getParsedMdContent).toHaveBeenCalledWith(
      'sv-03-01',
      jasmine.any(String)
    );
    expect(renderedMarkdown.at(-1)).toBe('<p>sv-03-01</p>');

    subscription.unsubscribe();
  });
});
