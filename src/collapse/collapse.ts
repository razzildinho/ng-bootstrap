import {Directive, Input, OnChanges, Renderer2, ElementRef} from '@angular/core';
import {Transition} from '../util/transition/ngbTransition';
import {collapsingTransition, showTransition} from '../util/transition/ngbCollapseTransition';
import {NgbConfig} from '../tokens';

/**
 * A directive to provide a simple way of hiding and showing elements on the page.
 */
@Directive({
  selector: '[ngbCollapse]',
  exportAs: 'ngbCollapse',
  host: {'[class.collapse]': 'true', '[class.show]': '!collapsed'}
})
export class NgbCollapse {
  private _firstChange = true;
  private _collapsed = false;

  /**
   * If `true`, will collapse the element or show it otherwise.
   */
  @Input('ngbCollapse')
  get collapsed() {
    return this._collapsed;
  }

  set collapsed(value) {
    this._collapsed = value;
    const element = this._element.nativeElement;
    const collapsing = this._collapsingTransition;
    collapsing.show(element, {enableAnimation: this._firstChange ? false : this.enableAnimation});
    this._firstChange = false;
  }

  /**
   * A flag to enable/disable the animation
   */
  @Input() enableAnimation = false;

  private _collapsingTransition: Transition;


  constructor(_renderer: Renderer2, private _element: ElementRef, private _ngbConfig: NgbConfig) {
    this.enableAnimation = _ngbConfig.enableAnimation;
    this._collapsingTransition = new Transition(collapsingTransition, _renderer);
  }
}
