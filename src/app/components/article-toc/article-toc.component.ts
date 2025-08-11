import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeadingNode } from '@models/article.model';
import { HtmlParserService } from '@services/html-parser.service';

@Component({
  selector: 'article-toc',
  templateUrl: './article-toc.component.html',
  styleUrls: ['./article-toc.component.scss'],
  imports: [NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleTocComponent {
  htmlContent = input<string | null>(null);
  tocMenuOpen = input<boolean>(false);

  private readonly htmlParser = inject(HtmlParserService);

  readonly nestedHeadings = computed<HeadingNode[]>(() => {
    const html = this.htmlContent();
    return html ? this.htmlParser.getHeadingsFromHtml(html) : [];
  });
}
