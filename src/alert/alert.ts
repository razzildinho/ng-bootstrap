import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  Renderer2,
  ElementRef,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';

import {NgbAlertConfig} from './alert-config';
import {Transition, TransitionOptions} from '../util/transition/ngbTransition';
import {NgbTransitionService} from '../util/transition/ngbTransitionService';

/**
 * Alert is a component to provide contextual feedback messages for user.
 *
 * It supports several alert types and can be dismissed.
 */
@Component({
  selector: 'ngb-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    'role': 'alert',
    'class': 'alert show',
    '[class.alert-dismissible]': 'dismissible',
    '[class.fade]': 'enableAnimation'
  },
  template: `
    <button *ngIf="dismissible" type="button" class="close" aria-label="Close" i18n-aria-label="@@ngb.alert.close"
      (click)="closeHandler()">
      <span aria-hidden="true">&times;</span>
    </button>
    <ng-content></ng-content>
    `,
  styleUrls: ['./alert.scss']
})
export class NgbAlert implements OnInit,
    OnChanges {
  private _fadingTransition: Transition;

  /**
   * If `true`, alert can be dismissed by the user.
   *
   * The close button (×) will be displayed and you can be notified
   * of the event with the `(close)` output.
   */
  @Input() dismissible: boolean;
  /**
   * Type of the alert.
   *
   * Bootstrap provides styles for the following types: `'success'`, `'info'`, `'warning'`, `'danger'`, `'primary'`,
   * `'secondary'`, `'light'` and `'dark'`.
   */
  @Input() type: string;

  /**
   * An event emitted when the close button is clicked. It has no payload and only relevant for dismissible alerts.
   */
  @Output() close = new EventEmitter<void>();

  /**
   * A flag to enable/disable the animation when closing.
   */
  @Input() enableAnimation: boolean;

  constructor(
      config: NgbAlertConfig, private _renderer: Renderer2, private _element: ElementRef,
      _transitionService: NgbTransitionService) {
    this.dismissible = config.dismissible;
    this.type = config.type;
    this.enableAnimation = config.enableAnimation;


    this._fadingTransition = new Transition({classname: 'show'}, this._renderer);

    const element = _element.nativeElement;
    _transitionService.onDestroy(
        element, () => { return this._fadingTransition.hide(element, {enableAnimation: this.enableAnimation}); });
  }

  closeHandler() { this.close.emit(null); }

  ngOnChanges(changes: SimpleChanges) {
    const typeChange = changes['type'];
    if (typeChange && !typeChange.firstChange) {
      this._renderer.removeClass(this._element.nativeElement, `alert-${typeChange.previousValue}`);
      this._renderer.addClass(this._element.nativeElement, `alert-${typeChange.currentValue}`);
    }
  }

  ngOnInit() { this._renderer.addClass(this._element.nativeElement, `alert-${this.type}`); }
}
