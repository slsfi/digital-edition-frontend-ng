import { Pipe, PipeTransform } from '@angular/core';

import { config } from '@config';
import { enableFrontMatterPage } from '@utility-functions';


/**
 * Generates a routerLink path to a page based on parent path
 * and child id.
 */
@Pipe({
    name: 'parentChildPagePath',
    standalone: true
})
export class ParentChildPagePathPipe implements PipeTransform {
    transform(parentPath: string, childId: string): string {
        if (parentPath === '/collection') {
            if (enableFrontMatterPage('cover', childId, config)) {
                return `${parentPath}/${childId}/cover`;
            } else if (enableFrontMatterPage('title', childId, config)) {
                return `${parentPath}/${childId}/title`;
            } else if (enableFrontMatterPage('foreword', childId, config)) {
                return `${parentPath}/${childId}/foreword`;
            } else if (enableFrontMatterPage('introduction', childId, config)) {
                return `${parentPath}/${childId}/introduction`;
            } else if (config.collections?.firstTextItem) {
                const idPath = config.collections.firstTextItem[childId]?.split('_') || [];
                if (idPath.length) {
                    idPath[0] = 'text';
                }
                return `/collection/${childId}/${idPath.join('/')}`;
            }
            return '';
        } else {
            return childId ? `${parentPath}/${childId}` : `${parentPath}`
        }
    }
}
