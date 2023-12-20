import { bootstrapApplication } from '@angular/platform-browser';

import { DigitalEditionApp } from './app/app.component';
import { config } from './app/app.config.server';

const bootstrap = () => bootstrapApplication(DigitalEditionApp, config);

export default bootstrap;
