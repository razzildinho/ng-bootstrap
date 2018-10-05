import {NgModule, ModuleWithProviders, RendererFactory2, NgZone} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NgbTransitionRendererFactory} from './ngbTransitionRenderer';
import {ɵDomRendererFactory2 as DomRendererFactory2} from '@angular/platform-browser';
import {NgbTransitionService} from './ngbTransitionService';

export function instantiateRendererFactory(
    renderer: DomRendererFactory2, zone: NgZone, transitionService: NgbTransitionService) {
  return new NgbTransitionRendererFactory(renderer, zone, transitionService);
}

@NgModule({
  providers: [
    NgbTransitionService, {
      provide: RendererFactory2,
      useFactory: instantiateRendererFactory,
      deps: [DomRendererFactory2, NgZone, NgbTransitionService]
    }
  ]
})
export class NgbTransitionModule {
}
