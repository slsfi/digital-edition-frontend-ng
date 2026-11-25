import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { CommentService } from './comment.service';
import { NamedEntityService } from './named-entity.service';
import { PlatformService } from './platform.service';
import { TooltipService } from './tooltip.service';


describe('TooltipService', () => {
  it('reads reused footnote IDs from the current reading text on desktop', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CommentService, useValue: {} },
        { provide: NamedEntityService, useValue: {} },
        { provide: PlatformService, useValue: { isMobile: () => false } }
      ]
    });
    const service = TestBed.inject(TooltipService);
    const column = document.createElement('div');
    column.className = 'text-column';
    column.id = 'first-column';
    column.innerHTML = `
      <span class="footnoteindicator tooltiptrigger ttFoot" data-id="ftn1">*)</span>
      <span class="tooltip ttFoot"><span class="ttFixed" data-id="ftn1">First note.</span></span>
    `;

    const firstTooltip = await firstValueFrom(
      service.getFootnoteTooltip('ftn1', 'reading-text', column.firstElementChild as HTMLElement)
    );
    expect(firstTooltip).toContain('<p class="footnoteText">First note.</p>');
    expect(firstTooltip).toContain('targetColumnId_first-column');

    column.id = 'second-column';
    column.innerHTML = `
      <span class="footnoteindicator tooltiptrigger ttFoot" data-id="ftn1">*)</span>
      <span class="tooltip ttFoot"><span class="ttFixed" data-id="ftn1">Second <em>note</em>.</span></span>
    `;

    const secondTooltip = await firstValueFrom(
      service.getFootnoteTooltip('ftn1', 'reading-text', column.firstElementChild as HTMLElement)
    );
    expect(secondTooltip).toContain('<p class="footnoteText">Second <em>note</em>.</p>');
    expect(secondTooltip).toContain('targetColumnId_second-column');
  });
});
