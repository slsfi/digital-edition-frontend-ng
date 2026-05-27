import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AUTH_ENABLED } from '@tokens/auth.tokens';
import { TopMenuComponent } from './top-menu.component';

type TestTopMenuComponent = TopMenuComponent & {
  languageHrefByCode: () => Record<string, string>;
};

describe('TopMenuComponent', () => {
  let router: { url: string };

  beforeEach(async () => {
    router = { url: '/' };

    await TestBed.configureTestingModule({
      imports: [TopMenuComponent],
      providers: [
        { provide: AUTH_ENABLED, useValue: false },
        { provide: LOCALE_ID, useValue: 'sv' },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(TopMenuComponent);
    return {
      fixture,
      component: fixture.componentInstance as TestTopMenuComponent
    };
  }

  it('preserves router query params when the input URL has the same path without query params', () => {
    router.url = '/login?rt=1';
    const { fixture, component } = createComponent();

    fixture.componentRef.setInput('currentRouterUrl', '/login');

    expect(component.languageHrefByCode()['fi']).toBe('/fi/login?rt=1');
  });

  it('uses input query params when they are already present', () => {
    router.url = '/login?rt=1';
    const { fixture, component } = createComponent();

    fixture.componentRef.setInput('currentRouterUrl', '/login?returnUrl=%2Fsearch');

    expect(component.languageHrefByCode()['fi']).toBe('/fi/login?returnUrl=%2Fsearch');
  });
});
