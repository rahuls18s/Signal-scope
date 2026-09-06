import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { GlobalErrorHandler } from './core/services/error.service';
export const appRootConfig: ApplicationConfig = { providers:[provideBrowserGlobalErrorListeners(),provideRouter(routes),{provide:ErrorHandler,useClass:GlobalErrorHandler}] };
