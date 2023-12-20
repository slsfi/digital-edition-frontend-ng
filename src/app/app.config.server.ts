import { ApplicationConfig,importProvidersFrom, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { IonicServerModule } from '@ionic/angular-server';

import { appConfigBase } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    importProvidersFrom(IonicServerModule)
  ]
};

export const config = mergeApplicationConfig(appConfigBase, serverConfig);
