import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { CommentService } from './comment.service';
import { NamedEntityService } from './named-entity.service';
import { PlatformService } from './platform.service';
import { TooltipService } from './tooltip.service';


describe('TooltipService', () => {
  let service: TooltipService;
  const getEntity = vi.fn<NamedEntityService['getEntity']>();

  beforeEach(() => {
    getEntity.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: CommentService, useValue: {} },
        { provide: NamedEntityService, useValue: { getEntity } },
        { provide: PlatformService, useValue: { isMobile: () => false } }
      ]
    });
    service = TestBed.inject(TooltipService);
  });

  it('uses the current person marker to label cached person data', async () => {
    getEntity.mockReturnValue(of({ full_name: 'Person' }));
    const trigger = document.createElement('span');

    for (const [classes, expectedTooltip] of [
      ['', '<b>Person</b>'],
      ['uncertain', 'ev. <b>Person</b>'],
      ['fictional', 'historisk förebild:<br/><b>Person</b>'],
      ['fictional uncertain', 'historisk förebild:<br/>ev. <b>Person</b>'],
      ['', '<b>Person</b>']
    ]) {
      trigger.className = classes;
      const tooltip = await firstValueFrom(service.getSemanticDataObjectTooltip('pe1', 'person', trigger));
      expect(tooltip).toBe(expectedTooltip);
    }
    expect(getEntity).toHaveBeenCalledExactlyOnceWith('person', 'pe1');
  });

  it('reads reused footnote IDs from the current reading text on desktop', async () => {
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
