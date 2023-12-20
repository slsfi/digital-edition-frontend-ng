import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./pages/home/home.routes')
  },
  {
    path: 'about',
    loadChildren: () => import('./pages/about/about.routes')
  },
  {
    path: 'content',
    loadChildren: () => import('./pages/content/content.routes')
  },
  {
    path: 'collection/:collectionID/cover',
    loadChildren: () => import('./pages/collection/cover/collection-cover.routes')
  },
  {
    path: 'collection/:collectionID/title',
    loadChildren: () => import('./pages/collection/title/collection-title.routes')
  },
  {
    path: 'collection/:collectionID/foreword',
    loadChildren: () => import('./pages/collection/foreword/collection-foreword.routes')
  },
  {
    path: 'collection/:collectionID/introduction',
    loadChildren: () => import('./pages/collection/introduction/collection-introduction.routes')
  },
  {
    path: 'collection/:collectionID/text',
    loadChildren: () => import('./pages/collection/text/collection-text.routes')
  },
  {
    path: 'ebook',
    loadChildren: () => import('./pages/ebook/ebook.routes')
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'index/:type',
    loadChildren: () => import('./pages/index/index.routes')
  },
  {
    path: 'media-collection',
    loadChildren: () => import('./pages/media-collection/media-collection.routes')
  },
  {
    path: 'search',
    loadChildren: () => import('./pages/elastic-search/elastic-search.routes')
  },
  {
    path: '**',
    loadChildren: () => import('./pages/page-not-found/page-not-found.routes')
  }
];
