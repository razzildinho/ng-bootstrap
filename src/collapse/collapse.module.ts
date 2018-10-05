import {NgModule, ModuleWithProviders} from '@angular/core';
import {NgbCollapse} from './collapse';
import {NgbTransitionModule} from '../util/transition/transition.module';

export {NgbCollapse} from './collapse';

@NgModule({declarations: [NgbCollapse], exports: [NgbCollapse], imports: [NgbTransitionModule]})
export class NgbCollapseModule {
  /**
   * Importing with '.forRoot()' is no longer necessary, you can simply import the module.
   * Will be removed in 4.0.0.
   *
   * @deprecated 3.0.0
   */
  static forRoot(): ModuleWithProviders { return {ngModule: NgbCollapseModule}; }
}
