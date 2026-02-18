import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RouterPreloadingStrategyService } from '@services/router-preloading-strategy.service';


const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'about',
    loadChildren: () => import('./pages/about/about.module').then( m => m.AboutPageModule)
  },
  {
    path: 'cookie-policy',
    data: {
      backendPageId: '05-01'
    },
    loadChildren: () => import('./pages/about/about.module').then( m => m.AboutPageModule)
  },
  {
    path: 'privacy-policy',
    data: {
      backendPageId: '05-02'
    },
    loadChildren: () => import('./pages/about/about.module').then( m => m.AboutPageModule)
  },
  {
    path: 'terms',
    data: {
      backendPageId: '05-03'
    },
    loadChildren: () => import('./pages/about/about.module').then( m => m.AboutPageModule)
  },
  {
    path: 'article',
    loadChildren: () => import('./pages/article/article.module').then( m => m.ArticlePageModule)
  },
  {
    path: 'content',
    loadChildren: () => import('./pages/content/content.module').then( m => m.ContentPageModule)
  },
  {
    path: 'collection/:collectionID/cover',
    loadChildren: () => import('./pages/collection/cover/collection-cover.module').then( m => m.CollectionCoverPageModule)
  },
  {
    path: 'collection/:collectionID/title',
    loadChildren: () => import('./pages/collection/title/collection-title.module').then( m => m.CollectionTitlePageModule)
  },
  {
    path: 'collection/:collectionID/foreword',
    loadChildren: () => import('./pages/collection/foreword/collection-foreword.module').then( m => m.CollectionForewordPageModule)
  },
  {
    path: 'collection/:collectionID/introduction',
    loadChildren: () => import('./pages/collection/introduction/collection-introduction.module').then( m => m.CollectionIntroductionPageModule)
  },
  {
    path: 'collection/:collectionID/text',
    loadChildren: () => import('./pages/collection/text/collection-text.module').then( m => m.CollectionTextPageModule)
  },
  {
    path: 'ebook',
    loadChildren: () => import('./pages/ebook/ebook.module').then( m => m.EbookPageModule)
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'index/:type',
    loadChildren: () => import('./pages/index/index.module').then( m => m.IndexPageModule)
  },
  {
    path: 'media-collection',
    loadChildren: () => import('./pages/media-collection/media-collection.module').then( m => m.MediaCollectionPageModule)
  },
  {
    path: 'search',
    loadChildren: () => import('./pages/elastic-search/elastic-search.module').then( m => m.ElasticSearchPageModule)
  },
  {
    path: '**',
    loadChildren: () => import('./pages/page-not-found/page-not-found.module').then( m => m.PageNotFoundPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: RouterPreloadingStrategyService,
      initialNavigation: 'enabledBlocking'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
