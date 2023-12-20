/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';

import { DigitalEditionApp } from './app/app.component';
import { appConfig } from './app/app.config';


bootstrapApplication(DigitalEditionApp, appConfig)
  .catch((err) => console.error(err));
