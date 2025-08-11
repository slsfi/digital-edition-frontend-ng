import { NgTemplateOutlet } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HeadingNode } from '@models/article.model';
import { HtmlParserService } from '@services/html-parser.service';


@Component({
  selector: 'article-toc',
  templateUrl: './article-toc.component.html',
  styleUrls: ['./article-toc.component.scss'],
  imports: [NgTemplateOutlet, RouterLink]
})
export class ArticleTocComponent implements OnInit {
  @Input() htmlContent: string | null = null;
  @Input() tocMenuOpen: boolean = false;
  nestedHeadings: HeadingNode[] = [];
  
  constructor(
    private htmlParser: HtmlParserService
  ) {}

  ngOnInit() {
    if (this.htmlContent) {
      this.nestedHeadings = this.htmlParser.getHeadingsFromHtml(this.htmlContent);
    }
  }

}
