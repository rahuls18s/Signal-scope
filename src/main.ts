import { bootstrapApplication } from '@angular/platform-browser';
import { appRootConfig } from './app/app-root.config';
import { AppRoot } from './app/app-root';

bootstrapApplication(AppRoot, appRootConfig).catch((err) => console.error(err));
