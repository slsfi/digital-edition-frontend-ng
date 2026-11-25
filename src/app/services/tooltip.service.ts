import { inject, Service } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import { config } from '@config';
import { TextKey } from '@models/collection.models';
import { NamedEntityDetails } from '@models/named-entity.models';
import { CommentService } from '@services/comment.service';
import { NamedEntityService } from '@services/named-entity.service';
import { PlatformService } from '@services/platform.service';


@Service()
export class TooltipService {
  private commentService = inject(CommentService);
  private namedEntityService = inject(NamedEntityService);
  private platformService = inject(PlatformService);

  private readonly maxTooltipCacheSize: number = 50;
  private readonly simpleWorkMetadata: boolean = config.modal?.namedEntity?.useSimpleWorkMetadata ?? false;

  private readonly cachedCommentTooltips = new Map<string, string>();
  private readonly cachedPersons = new Map<string, NamedEntityDetails>();
  private readonly cachedPlaceTooltips = new Map<string, string>();
  private readonly cachedWorkTooltips = new Map<string, string>();

  getSemanticDataObjectTooltip(id: string, type: string, targetElem: HTMLElement): Observable<string> {
    const cachedPerson = type === 'person' ? this.cachedPersons.get(id) : undefined;
    if (cachedPerson) {
      return of(this.constructPersonTooltipText(cachedPerson, targetElem));
    }

    const cachedTooltip =
      type === 'place' ? this.cachedPlaceTooltips.get(id)
      : type === 'work' ? this.cachedWorkTooltips.get(id)
      : undefined;

    if (cachedTooltip) {
      return of(cachedTooltip);
    }

    const noInfoFound = $localize`:@@NamedEntity.NoInfoFound:Ingen information hittades.`;

    if (type === 'work' && !this.simpleWorkMetadata) {
      return this.namedEntityService.getEntityFromElastic('work', id).pipe(
        map((tooltip) => {
          let text = noInfoFound;
          if (tooltip?.hits?.hits?.[0]?.['_source']) {
            tooltip = tooltip.hits.hits[0]['_source'];
            text = '<span class="work_title">' + tooltip.title  + '</span><br/>' + tooltip.reference;
            this.cachedWorkTooltips.size > this.maxTooltipCacheSize && this.cachedWorkTooltips.clear();
            this.cachedWorkTooltips.set(id, text);
          }
          return text || noInfoFound;
        }),
        catchError((e) => {
          return of(noInfoFound);
        })
      );
    } else {
      return this.namedEntityService.getEntity(type, id).pipe(
        map((tooltip) => {
          let text = '';
          if (type === 'person') {
            text = this.constructPersonTooltipText(tooltip, targetElem);
            this.cachedPersons.size > this.maxTooltipCacheSize && this.cachedPersons.clear();
            this.cachedPersons.set(id, tooltip);
          } else if (type === 'place') {
            text = '<b>' + tooltip.name.trim() + '</b>';
            tooltip.description && (text += ', ' + tooltip.description.trim());
            this.cachedPlaceTooltips.size > this.maxTooltipCacheSize && this.cachedPlaceTooltips.clear();
            this.cachedPlaceTooltips.set(id, text);
          } else if (type === 'work') {
            text = tooltip.title ?? '';
            this.cachedWorkTooltips.size > this.maxTooltipCacheSize && this.cachedWorkTooltips.clear();
            this.cachedWorkTooltips.set(id, text);
          }
          return text || noInfoFound;
        }),
        catchError((e) => {
          return of(noInfoFound);
        })
      );
    }
  }

  /**
   * Can be used to fetch tooltip in situations like these:
   * <img src=".." data-id="en5929">
   * <span class="tooltip"></span>
   */
  getCommentTooltip(textKey: TextKey, elementID: string): Observable<any> {
    elementID = elementID.replace('end', 'en');
    // A comment ID identifies the same explanatory note across texts in an edition.
    const cachedTooltip = this.cachedCommentTooltips.get(elementID);

    if (cachedTooltip) {
      return of({ name: 'Comment', description: cachedTooltip });
    }

    return this.commentService.getSingleComment(textKey, elementID).pipe(
      map((comment) => {
        this.cachedCommentTooltips.size > this.maxTooltipCacheSize && this.cachedCommentTooltips.clear();
        !this.platformService.isMobile() && this.cachedCommentTooltips.set(elementID, comment);
        return comment ?
          { name: 'Comment', description: comment } :
          { name: 'Error', description: '' };
      })
    );
  }

  getFootnoteTooltip(id: string, textType: string, triggerElem: HTMLElement): Observable<string> {
    // Footnote IDs can be reused across texts and columns. Read the note next to its trigger.
    const textTypeClass = (textType === 'variant') ? 'teiVariant'
      : (textType === 'manuscript') ? 'teiManuscript'
      : '';

    if (
      (
        (
          textTypeClass &&
          triggerElem.nextElementSibling?.classList.contains(textTypeClass)
        ) || !textTypeClass
      ) &&
      triggerElem.nextElementSibling?.classList.contains('ttFoot') &&
      triggerElem.nextElementSibling?.firstElementChild?.classList.contains('ttFixed') &&
      (
        (
          (!textTypeClass || textType === 'manuscript') &&
          triggerElem.nextElementSibling?.firstElementChild?.getAttribute('data-id') === id
        ) || (
          textType === 'variant' &&
          triggerElem.nextElementSibling?.firstElementChild?.getAttribute('id') === id
        )
      )
    ) {
      let ttText = triggerElem.nextElementSibling.firstElementChild.innerHTML;
      // MathJax problem with resolving the actual formula, not the translated formula.
      if (triggerElem.nextElementSibling.firstElementChild.lastChild?.nodeName === 'SCRIPT') {
        const tmpElem = <HTMLElement> triggerElem.nextElementSibling.firstElementChild.lastChild;
        ttText = '$' + tmpElem.innerHTML + '$';
      }

      ttText = ttText.replaceAll(' xmlns:tei="http://www.tei-c.org/ns/1.0"', '');

      let columnId = '';
      if (!this.platformService.isMobile()) {
        // Get column id of the column where the footnote is.
        let containerElem = triggerElem.parentElement;
        while (
          containerElem !== null &&
          !(containerElem.classList.contains('text-column') && containerElem.hasAttribute('id'))
        ) {
          containerElem = containerElem.parentElement;
        }
        if (containerElem !== null) {
          columnId = containerElem.getAttribute('id') || '';
        }
      }

      // Prepend the footnoteindicator to the the footnote text.
      const footnoteHTML: string = '<div class="footnoteWrapper">'
        + '<a class="xreference footnoteReference'
        + (textTypeClass ? ' ' + textTypeClass : '')
        + (columnId ? ' targetColumnId_' + columnId : '')
        + '" href="#' + id + '">' + triggerElem.textContent
        + '</a>' + '<p class="footnoteText">' + ttText  + '</p></div>';
      return of(footnoteHTML);
    } else {
      return of('');
    }
  }

  constructPersonTooltipText(tooltip: any, targetElem: HTMLElement) {
    const uncertainPretext = (
      targetElem.classList.contains('uncertain') &&
      $localize`:@@NamedEntity.Possibly:ev.`
    ) ? $localize`:@@NamedEntity.Possibly:ev.` + ' ' : '';
    const fictionalPretext = (
      targetElem.classList.contains('fictional') &&
      $localize`:@@NamedEntity.HistoricalFigureLabel:historisk förebild`
    ) ? $localize`:@@NamedEntity.HistoricalFigureLabel:historisk förebild` + ':<br/>' : '';

    let text = '<b>' + tooltip.full_name.trim() + '</b>';
    const yearBornDeceasedString = this.constructYearBornDeceasedString(
      tooltip.date_born,
      tooltip.date_deceased
    );
    (yearBornDeceasedString !== '') && (text += ' ' + yearBornDeceasedString);
    (tooltip.description !== null) && (text += ', ' + tooltip.description);
    text = uncertainPretext + text;
    text = fictionalPretext + text;
    return text;
  }

  constructYearBornDeceasedString(dateBorn?: string | null, dateDeceased?: string | null): string {
    // Get the born and deceased years without leading zeros and possible 'BC' indicators
    const yearBorn =
      dateBorn !== undefined && dateBorn !== null
        ? String(dateBorn).split('-')[0].replace(/^0+/, '').split(' ')[0]
        : null;
    const yearDeceased =
      dateDeceased !== undefined && dateDeceased !== null
        ? String(dateDeceased).split('-')[0].replace(/^0+/, '').split(' ')[0]
        : null;
    const bcIndicatorDeceased = String(dateDeceased).includes('BC')
      ? ' ' + $localize`:@@NamedEntity.BC:f.Kr.`
      : '';
    let bcIndicatorBorn = String(dateBorn).includes('BC')
      ? ' ' + $localize`:@@NamedEntity.BC:f.Kr.`
      : '';
    if (
      String(dateBorn).includes('BC') &&
      bcIndicatorDeceased === bcIndicatorBorn
    ) {
      // Born and deceased BC, don't add indicator to year born
      bcIndicatorBorn = '';
    }
    let yearBornDeceased = '';
    if (
      yearBorn !== null &&
      yearDeceased !== null &&
      yearBorn !== 'null' &&
      yearDeceased !== 'null'
    ) {
      yearBornDeceased = '(' + yearBorn + bcIndicatorBorn + '–' + yearDeceased + bcIndicatorDeceased + ')';
    } else if (yearBorn !== null && yearBorn !== 'null') {
      yearBornDeceased = '(* ' + yearBorn + bcIndicatorBorn + ')';
    } else if (yearDeceased !== null && yearDeceased !== 'null') {
      yearBornDeceased = '(&#8224; ' + yearDeceased + bcIndicatorDeceased + ')';
    }
    return yearBornDeceased;
  }

  /**
   * Function for getting the properties (size, scale) of the tooltip element.
   * @param targetElem The html element which has triggered the tooltip.
   * @param ttText The text that goes in the tooltip.
   * @param pageOrigin The name of the page that is calling the function. Currently
   * either 'page-text' or 'page-introduction'.
   * @returns Object with the following keys: maxWidth, scaleValue, top and left.
   */
  getTooltipProperties(targetElem: HTMLElement, ttText: string, pageOrigin = 'page-text') {
    let toolTipMaxWidth = '';
    let toolTipScaleValue = 1;

    // Set vertical offset. This is an adjustment in relation to the trigger element.
    const yOffset = 5;

    // Set how close to the edges of the "window" the tooltip can be placed. Currently this only applies if the
    // tooltip is set above or below the trigger.
    const edgePadding = 5;

    // Set "padding" around tooltip trigger – this is how close to the trigger element the tooltip will be placed.
    const triggerPaddingX = 8;
    const triggerPaddingY = 8;

    // Set min and max width for resized tooltips.
    const resizedToolTipMinWidth = 300;
    const resizedToolTipMaxWidth = 600;

    // Get viewport width and height.
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    let vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

    // Get how much the page has scrolled horizontally to the left.
    // Get the page content element and adjust viewport height with horizontal
    // scrollbar height if such is present.
    // Also get how much the page has scrolled horizontally to the left.
    // Set horisontal offset due to possible side pane (menu) on the left.
    let scrollLeft = 0;
    let horizontalScrollbarOffsetHeight = 0;
    let sidePaneOffsetWidth = 0; // A default value, true value calculated with getBoundingClientRect() below
    let toolbarsHeight = 120; // A default value, true value calculated with getBoundingClientRect() below
    const contentElem = document.querySelector(
      pageOrigin + ':not([ion-page-hidden]):not(.ion-page-hidden) > ion-content.collection-ion-content'
    )?.shadowRoot?.querySelector('[part="scroll"]') as HTMLElement;
    if (contentElem !== null) {
      scrollLeft = contentElem.scrollLeft;
      sidePaneOffsetWidth = contentElem.getBoundingClientRect().left;
      toolbarsHeight = contentElem.getBoundingClientRect().top;
      if (contentElem.clientHeight < contentElem.offsetHeight) {
        horizontalScrollbarOffsetHeight = contentElem.offsetHeight - contentElem.clientHeight;
      }
    }

    // Adjust effective viewport height if horizontal scrollbar present.
    vh = vh - horizontalScrollbarOffsetHeight;

    // Set variable for determining if the tooltip should be placed above or below the trigger
    // rather than beside it.
    let positionAboveOrBelowTrigger: boolean = false;
    let positionAbove: boolean = false;

    // Get rectangle which contains tooltiptrigger element. For trigger elements
    // spanning multiple lines tooltips are always placed above or below the trigger.
    const elemRects = targetElem.getClientRects();
    let elemRect = null;
    if (elemRects.length === 1) {
      elemRect = elemRects[0];
    } else {
      positionAboveOrBelowTrigger = true;
      if (
        elemRects[0].top -
          triggerPaddingY -
          toolbarsHeight -
          edgePadding >
        vh -
          elemRects[elemRects.length - 1].bottom -
          triggerPaddingY -
          edgePadding
      ) {
        elemRect = elemRects[0];
        positionAbove = true;
      } else {
        elemRect = elemRects[elemRects.length - 1];
      }
    }

    // Find the tooltip element.
    const tooltipElement: HTMLElement | null = document.querySelector(
      pageOrigin + ':not([ion-page-hidden]):not(.ion-page-hidden) div.toolTip'
    );
    if (!tooltipElement) {
      return null;
    }

    // Get tooltip element's default dimensions and computed max-width (latter set by css).
    const initialTTDimensions = this.getToolTipDimensions(tooltipElement, ttText, 0, true);
    let ttHeight = initialTTDimensions?.height || 0;
    let ttWidth = initialTTDimensions?.width || 0;

    toolTipMaxWidth = initialTTDimensions?.compMaxWidth || '425px';

    // Calculate default position, this is relative to the viewport's top-left corner.
    let x = elemRect.right + triggerPaddingX;
    let y = elemRect.top - yOffset - toolbarsHeight;

    // Check if tooltip would be drawn outside the viewport.
    let oversetX = x + ttWidth - vw;
    let oversetY = elemRect.top + ttHeight - vh;
    if (!positionAboveOrBelowTrigger) {
      if (oversetX > 0) {
        if (oversetY > 0) {
          // Overset both vertically and horisontally. Check if tooltip can be moved to the left
          // side of the trigger and upwards without modifying its dimensions.
          if (
            elemRect.left - sidePaneOffsetWidth > ttWidth + triggerPaddingX &&
            y > oversetY
          ) {
            // Move tooltip to the left side of the trigger and upwards
            x = elemRect.left - ttWidth - triggerPaddingX;
            y = y - oversetY;
          } else {
            // Calc how much space there is on either side and attempt to place the tooltip
            // on the side with more space.
            const spaceRight = vw - x;
            const spaceLeft = elemRect.left - sidePaneOffsetWidth - triggerPaddingX;
            const maxSpace = Math.floor(Math.max(spaceRight, spaceLeft));

            const ttDimensions = this.getToolTipDimensions(tooltipElement, ttText, maxSpace);
            ttHeight = ttDimensions?.height || 0;
            ttWidth = ttDimensions?.width || 0;

            // Double-check that the narrower tooltip fits, but isn't too narrow.
            if (ttWidth <= maxSpace && ttWidth > resizedToolTipMinWidth) {
              // There is room, set new max-width.
              toolTipMaxWidth = ttWidth + 'px';
              if (spaceLeft > spaceRight) {
                // Calc new horisontal position since an attempt to place the tooltip on the left will be made.
                x = elemRect.left - triggerPaddingX - ttWidth;
              }
              // Check vertical space.
              oversetY = elemRect.top + ttHeight - vh;
              if (oversetY > 0) {
                if (oversetY < y) {
                  // Move the y position upwards by oversetY.
                  y = y - oversetY;
                } else {
                  positionAboveOrBelowTrigger = true;
                }
              }
            } else {
              positionAboveOrBelowTrigger = true;
            }
          }
        } else {
          // Overset only horisontally. Check if there is room on the left side of the trigger.
          if (elemRect.left - sidePaneOffsetWidth - triggerPaddingX > ttWidth) {
            // There is room on the left --> move tooltip there.
            x = elemRect.left - ttWidth - triggerPaddingX;
          } else {
            // There is not enough room on the left. Try to squeeze in the tooltip on whichever side
            // has more room. Calc how much space there is on either side.
            const spaceRight = vw - x;
            const spaceLeft = elemRect.left - sidePaneOffsetWidth - triggerPaddingX;
            const maxSpace = Math.floor(Math.max(spaceRight, spaceLeft));

            const ttDimensions = this.getToolTipDimensions(tooltipElement, ttText, maxSpace);
            ttHeight = ttDimensions?.height || 0;
            ttWidth = ttDimensions?.width || 0;

            // Double-check that the narrower tooltip fits, but isn't too narrow.
            if (ttWidth <= maxSpace && ttWidth > resizedToolTipMinWidth) {
              // There is room, set new max-width.
              toolTipMaxWidth = ttWidth + 'px';
              if (spaceLeft > spaceRight) {
                // Calc new horisontal position since an attempt to place the tooltip on the left will be made.
                x = elemRect.left - triggerPaddingX - ttWidth;
              }
              // Check vertical space.
              oversetY = elemRect.top + ttHeight - vh;
              if (oversetY > 0) {
                if (oversetY < y) {
                  // Move the y position upwards by oversetY.
                  y = y - oversetY;
                } else {
                  positionAboveOrBelowTrigger = true;
                }
              }
            } else {
              positionAboveOrBelowTrigger = true;
            }
          }
        }
      } else if (oversetY > 0) {
        // Overset only vertically. Check if there is room to move the tooltip upwards.
        if (oversetY < y) {
          // Move the y position upwards by oversetY.
          y = y - oversetY;
        } else {
          // There is not room to move the tooltip just upwards. Check if there is more room on the
          // left side of the trigger so the width of the tooltip could be increased there.
          const spaceRight = vw - x;
          const spaceLeft = elemRect.left - sidePaneOffsetWidth - triggerPaddingX;

          if (spaceLeft > spaceRight) {
            const ttDimensions = this.getToolTipDimensions(tooltipElement, ttText, spaceLeft);
            ttHeight = ttDimensions?.height || 0;
            ttWidth = ttDimensions?.width || 0;

            if (
              ttWidth <= spaceLeft &&
              ttWidth > resizedToolTipMinWidth &&
              ttHeight < vh - yOffset - toolbarsHeight
            ) {
              // There is enough space on the left side of the trigger. Calc new positions.
              toolTipMaxWidth = ttWidth + 'px';
              x = elemRect.left - triggerPaddingX - ttWidth;
              oversetY = elemRect.top + ttHeight - vh;
              y = y - oversetY;
            } else {
              positionAboveOrBelowTrigger = true;
            }
          } else {
            positionAboveOrBelowTrigger = true;
          }
        }
      }
    }

    if (positionAboveOrBelowTrigger) {
      // The tooltip could not be placed next to the trigger, so it has to be placed above or below it.
      // Check if there is more space above or below the tooltip trigger.
      let availableHeight = 0;
      if (elemRects.length > 1 && positionAbove) {
        availableHeight = elemRect.top - toolbarsHeight - triggerPaddingY - edgePadding;
      } else if (elemRects.length > 1) {
        availableHeight = vh - elemRect.bottom - triggerPaddingY - edgePadding;
      } else if (elemRect.top - toolbarsHeight > vh - elemRect.bottom) {
        positionAbove = true;
        availableHeight = elemRect.top - toolbarsHeight - triggerPaddingY - edgePadding;
      } else {
        positionAbove = false;
        availableHeight = vh - elemRect.bottom - triggerPaddingY - edgePadding;
      }

      const availableWidth = vw - sidePaneOffsetWidth - 2 * edgePadding;

      if (
        (initialTTDimensions?.height || 0) <= availableHeight &&
        (initialTTDimensions?.width || 0) <= availableWidth
      ) {
        // The tooltip fits without resizing. Calculate position, check for possible overset and adjust.
        x = elemRect.left;
        y = positionAbove
              ? elemRect.top - (initialTTDimensions?.height || 0) - toolbarsHeight - triggerPaddingY
              : elemRect.bottom + triggerPaddingY - toolbarsHeight;

        // Check if tooltip would be drawn outside the viewport horisontally.
        oversetX = x + (initialTTDimensions?.width || 0) - vw;
        if (oversetX > 0) {
          x = x - oversetX - edgePadding;
        }
      } else {
        // Try to resize the tooltip so it would fit in view.
        let newTTMaxWidth = Math.floor(availableWidth);
        if (newTTMaxWidth > resizedToolTipMaxWidth) {
          newTTMaxWidth = resizedToolTipMaxWidth;
        }
        // Calculate tooltip dimensions with new max-width
        const ttNewDimensions = this.getToolTipDimensions(tooltipElement, ttText, newTTMaxWidth);

        if (
          (ttNewDimensions?.height || 0) <= availableHeight &&
          (ttNewDimensions?.width || 0) <= availableWidth
        ) {
          // Set new max-width and calculate position. Adjust if overset.
          toolTipMaxWidth = (ttNewDimensions?.width || 0) + 'px';
          x = elemRect.left;
          y = positionAbove
                ? elemRect.top - (ttNewDimensions?.height || 0) - toolbarsHeight - triggerPaddingY
                : elemRect.bottom + triggerPaddingY - toolbarsHeight;

          // Check if tooltip would be drawn outside the viewport horisontally.
          oversetX = x + (ttNewDimensions?.width || 0) - vw;
          if (oversetX > 0) {
            x = x - oversetX - edgePadding;
          }
        } else {
          // Resizing the width and height of the tooltip element won't make it fit in view.
          // Basically this means that the width is ok, but the height isn't.
          // As a last resort, scale the tooltip so it fits in view.
          const ratioX = availableWidth / (ttNewDimensions?.width || 1);
          const ratioY = availableHeight / (ttNewDimensions?.height || 1);
          const scaleRatio = Math.min(ratioX, ratioY) - 0.01;

          toolTipMaxWidth = (ttNewDimensions?.width || 0) + 'px';
          toolTipScaleValue = scaleRatio;
          x = elemRect.left;
          y = positionAbove
                ? elemRect.top - availableHeight - triggerPaddingY - toolbarsHeight
                : elemRect.bottom + triggerPaddingY - toolbarsHeight;

          oversetX = x + (ttNewDimensions?.width || 0) - vw;
          if (oversetX > 0) {
            x = x - oversetX - edgePadding;
          }
        }
      }
    }

    const toolTipProperties = {
      maxWidth: toolTipMaxWidth,
      scaleValue: toolTipScaleValue,
      top: y + 'px',
      left: x + scrollLeft - sidePaneOffsetWidth + 'px',
    };

    return toolTipProperties;
  }

  /**
   * Function for calculating the dimensions of the tooltip element for a given text.
   * @param toolTipElem The tooltip HTML element.
   * @param toolTipText The text that goes in the tooltip.
   * @param maxWidth Maximum width of the tooltip element.
   * @param returnCompMaxWidth Boolean determining whether or not the css computed max width
   * should be included in the returned object.
   * @returns Object containing width, height and computed max-width of the tooltip for the
   * given text.
   */
  private getToolTipDimensions(
    toolTipElem: HTMLElement,
    toolTipText: string,
    maxWidth = 0,
    returnCompMaxWidth: boolean = false
  ) {
    // Create hidden div and make it into a copy of the tooltip div. Calculations are done on the hidden div.
    const hiddenDiv: HTMLElement = document.createElement('div');

    // Loop over each class in the tooltip element and add them to the hidden div.
    if (toolTipElem.className !== '') {
      const ttClasses: string[] = Array.from(toolTipElem.classList);
      ttClasses.forEach(function (currentValue, currentIndex, listObj) {
        hiddenDiv.classList.add(currentValue);
      });
    } else {
      return undefined;
    }

    // Don't display the hidden div initially. Set max-width if defined, otherwise the max-width will be determined by css.
    hiddenDiv.style.display = 'none';
    hiddenDiv.style.position = 'absolute';
    hiddenDiv.style.top = '0';
    hiddenDiv.style.left = '0';
    if (maxWidth > 0) {
      hiddenDiv.style.maxWidth = maxWidth + 'px';
    }
    // Append hidden div to the parent of the tooltip element.
    toolTipElem.parentNode?.appendChild(hiddenDiv);
    // Add content to the hidden div.
    hiddenDiv.innerHTML = toolTipText;
    // Make div visible again to calculate its width and height.
    hiddenDiv.style.visibility = 'hidden';
    hiddenDiv.style.display = 'block';
    const ttHeight = hiddenDiv.offsetHeight;
    const ttWidth = hiddenDiv.offsetWidth;
    let compToolTipMaxWidth = '';
    if (returnCompMaxWidth) {
      // Get default tooltip max-width from css of hidden div if possible.
      const hiddenDivCompStyles = window.getComputedStyle(hiddenDiv);
      compToolTipMaxWidth = hiddenDivCompStyles.getPropertyValue('max-width');
    }
    // Calculations are done so the hidden div can/must be removed.
    hiddenDiv.remove();

    const dimensions = {
      width: ttWidth,
      height: ttHeight,
      compMaxWidth: compToolTipMaxWidth,
    };

    return dimensions;
  }

}
