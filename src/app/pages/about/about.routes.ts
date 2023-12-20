import { Route } from '@angular/router';

import { AboutPage } from './about.page';


export default [
  { path: ':id', component: AboutPage }
] satisfies Route[];
