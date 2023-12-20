import { Route } from '@angular/router';

import { ElasticSearchPage } from './elastic-search.page';


export default [
  { path: ':query', component: ElasticSearchPage },
  { path: '', component: ElasticSearchPage }
] satisfies Route[];
