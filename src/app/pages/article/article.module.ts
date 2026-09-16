import { NgModule } from '@angular/core';

import { ArticlePage } from './article.page';
import { ArticlePageRoutingModule } from './article-routing.module';

@NgModule({
  imports: [
    ArticlePage,
    ArticlePageRoutingModule,
  ]
})
export class ArticlePageModule {}
