import { Route } from '@angular/router';

import { MediaCollectionPage } from './media-collection.page';


export default [
  { path: ':mediaCollectionID', component: MediaCollectionPage },
  { path: '', component: MediaCollectionPage }
] satisfies Route[];
