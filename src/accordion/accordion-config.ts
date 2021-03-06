import {Injectable, Inject} from '@angular/core';
import {NgbConfig} from '../tokens';

/**
 * A configuration service for the [NgbAccordion](#/components/accordion/api#NgbAccordion) component.
 *
 * You can inject this service, typically in your root component, and customize its properties
 * to provide default values for all accordions used in the application.
 */
@Injectable({providedIn: 'root'})
export class NgbAccordionConfig {
  closeOthers = false;
  type: string;
  enableAnimation: boolean;

  constructor(ngbConfig: NgbConfig) { this.enableAnimation = ngbConfig.enableAnimation; }
}
