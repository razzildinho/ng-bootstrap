import {Injectable} from '@angular/core';
import {NgbConfig} from '../tokens';

/**
 * A configuration service for the [`NgbTabset`](#/components/tabset/api#NgbTabset) component.
 *
 * You can inject this service, typically in your root component, and customize the values of its properties in
 * order to provide default values for all the tabsets used in the application.
 */
@Injectable({providedIn: 'root'})
export class NgbTabsetConfig {
  justify: 'start' | 'center' | 'end' | 'fill' | 'justified' = 'start';
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  type: 'tabs' | 'pills' = 'tabs';
  enableAnimation: boolean;

  constructor(ngbConfig: NgbConfig) { this.enableAnimation = ngbConfig.enableAnimation; }
}
