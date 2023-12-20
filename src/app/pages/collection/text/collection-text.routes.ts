import { Route } from '@angular/router';

import { CollectionTextPage } from './collection-text.page';


export default [
  { path: ':publicationID', component: CollectionTextPage },
  { path: ':publicationID/:chapterID', component: CollectionTextPage }
] satisfies Route[];
