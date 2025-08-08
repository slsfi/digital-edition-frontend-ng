import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { TrustHtmlPipe } from '@pipes/trust-html.pipe';
import { ArticlePage } from './article.page';
import { ArticlePageRoutingModule } from './article-routing.module';

@NgModule({
  declarations: [
    ArticlePage
  ],
  imports: [
    CommonModule,
    IonicModule,
    TrustHtmlPipe,
    ArticlePageRoutingModule,
  ]
})
export class ArticlePageModule {}
