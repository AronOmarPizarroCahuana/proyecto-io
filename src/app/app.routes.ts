import { Routes } from '@angular/router';
import { EsquinaNoroeste } from './esquina-noroeste/esquina-noroeste.component.js';
import { CostoMinimo } from './costo-minimo/costo-minimo.component.js';
import { AproximacionVogel } from './aproximacion-vogel/aproximacion-vogel.component.js';
import { Hungaro } from './hungaro/hungaro.component.js';

export const routes: Routes = [
  { path: 'esquina-noroeste', component: EsquinaNoroeste },
  { path: 'costo-minimo', component: CostoMinimo },
  { path: 'aproximacion-vogel', component: AproximacionVogel },
  { path: 'hungaro', component: Hungaro },
];
