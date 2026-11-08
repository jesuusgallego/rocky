import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Carga los datos del idioma español (nombres de días y meses) para formatear fechas.
registerLocaleData(localeEs);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
