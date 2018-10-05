import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Directive,
  EventEmitter,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  QueryList,
  TemplateRef,
  ElementRef,
  Renderer2
} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

import {NgbCarouselConfig} from './carousel-config';

import {merge, Subject, timer, zip} from 'rxjs';
import {filter, map, switchMap, takeUntil, take} from 'rxjs/operators';
import {Transition, TransitionOptions} from '../util/transition/ngbTransition';

let nextId = 0;

/**
 * A directive that wraps the individual carousel slide.
 */
@Directive({selector: 'ng-template[ngbSlide]'})
export class NgbSlide {
  /**
   * Slide id that must be unique for the entire document.
   *
   * If not provided, will be generated in the `ngb-slide-xx` format.
   */
  @Input() id = `ngb-slide-${nextId++}`;

  constructor(public tplRef: TemplateRef<any>) {}
}

/**
 * Carousel is a component to easily create and control slideshows.
 *
 * Allows to set intervals, change the way user interacts with the slides and provides a programmatic API.
 */
@Component({
  selector: 'ngb-carousel',
  exportAs: 'ngbCarousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'carousel slide',
    '[style.display]': '"block"',
    'tabIndex': '0',
    '(mouseenter)': 'pauseOnHover && pause()',
    '(mouseleave)': 'pauseOnHover && cycle()',
    '(keydown.arrowLeft)': 'keyboard && prev()',
    '(keydown.arrowRight)': 'keyboard && next()'
  },
  template: `
    <ol class="carousel-indicators" *ngIf="showNavigationIndicators">
      <li *ngFor="let slide of slides" [id]="'ngb-slide-indicator-' + slide.id"
          (click)="select(slide.id); pauseOnHover && pause()"></li>
    </ol>
    <div class="carousel-inner">
      <div *ngFor="let slide of slides" class="carousel-item" [id]="'ngb-slide-' + slide.id">
        <ng-template [ngTemplateOutlet]="slide.tplRef"></ng-template>
      </div>
    </div>
    <a class="carousel-control-prev" role="button" (click)="prev()" *ngIf="showNavigationArrows">
      <span class="carousel-control-prev-icon" aria-hidden="true"></span>
      <span class="sr-only" i18n="@@ngb.carousel.previous">Previous</span>
    </a>
    <a class="carousel-control-next" role="button" (click)="next()" *ngIf="showNavigationArrows">
      <span class="carousel-control-next-icon" aria-hidden="true"></span>
      <span class="sr-only" i18n="@@ngb.carousel.next">Next</span>
    </a>
  `
})
export class NgbCarousel implements AfterContentInit,
    OnChanges, OnDestroy {
  @ContentChildren(NgbSlide) slides: QueryList<NgbSlide>;

  private _destroy$ = new Subject<void>();
  private _start$ = new Subject<void>();
  private _stop$ = new Subject<void>();

  private _activeTransition: Transition;
  private _outTransition: Transition;
  private _inTransition: Transition;

  /**
   * A flag to enable/disable the animation when closing.
   */
  @Input() enableAnimation: boolean;

  /**
   * The slide id that should be displayed **initially**.
   *
   * For subsequent interactions use methods `select()`, `next()`, etc. and the `(slide)` output.
   */
  @Input() activeId: string;

  /**
   * Time in milliseconds before the next slide is shown.
   */
  @Input() interval: number;

  /**
   * If `true`, will 'wrap' the carousel by switching from the last slide back to the first.
   */
  @Input() wrap: boolean;

  /**
   * If `true`, allows to interact with carousel using keyboard 'arrow left' and 'arrow right'.
   */
  @Input() keyboard: boolean;

  /**
   * If `true`, will pause slide switching when mouse cursor hovers the slide.
   *
   * @since 2.2.0
   */
  @Input() pauseOnHover: boolean;

  /**
   * If `true`, 'previous' and 'next' navigation arrows will be visible on the slide.
   *
   * @since 2.2.0
   */
  @Input() showNavigationArrows: boolean;

  /**
   * If `true`, navigation indicators at the bottom of the slide will be visible.
   *
   * @since 2.2.0
   */
  @Input() showNavigationIndicators: boolean;

  /**
   * An event emitted right after the slide transition is completed.
   *
   * See [`NgbSlideEvent`](#/components/carousel/api#NgbSlideEvent) for payload details.
   */
  @Output() slide = new EventEmitter<NgbSlideEvent>();

  constructor(
      config: NgbCarouselConfig, @Inject(PLATFORM_ID) private _platformId, private _ngZone: NgZone,
      private _cd: ChangeDetectorRef, private _element: ElementRef, private _renderer: Renderer2) {
    this.enableAnimation = config.enableAnimation;
    this.interval = config.interval;
    this.wrap = config.wrap;
    this.keyboard = config.keyboard;
    this.pauseOnHover = config.pauseOnHover;
    this.showNavigationArrows = config.showNavigationArrows;
    this.showNavigationIndicators = config.showNavigationIndicators;

    this._activeTransition = new Transition({classname: 'active'}, this._renderer);

    this._outTransition = new Transition(
        {
          beforeTransitionStart: (panelElement: HTMLElement, options: TransitionOptions) => {
            this._renderer.addClass(panelElement, 'carousel-item-' + options.data.direction);
          },
          afterTransitionEnd: (panelElement: HTMLElement, options: TransitionOptions) => {
            const data = options.data;
            this._renderer.removeClass(panelElement, 'carousel-item-' + data.direction);
            this._toggleActive(data.slideId, false);
          }
        },
        this._renderer);

    this._inTransition = new Transition(
        {
          beforeTransitionStart: (panelElement: HTMLElement, options: TransitionOptions) => {
            let classname =
                options.data.direction === NgbSlideEventDirection.LEFT ? 'carousel-item-next' : 'carousel-item-prev';

            this._renderer.addClass(panelElement, classname);

            // Reflow
            /* tslint:disable:no-unused-expression */
            panelElement.offsetHeight;

            this._renderer.addClass(panelElement, 'carousel-item-' + options.data.direction);

          },
          afterTransitionEnd: (panelElement: HTMLElement, options: TransitionOptions) => {
            const data = options.data;
            let classname =
                data.direction === NgbSlideEventDirection.LEFT ? 'carousel-item-next' : 'carousel-item-prev';
            this._renderer.removeClass(panelElement, classname);
            this._renderer.removeClass(panelElement, 'carousel-item-' + data.direction);
            this._toggleActive(data.slideId, true);
          }
        },
        this._renderer);
  }

  _runTransition(slide: NgbSlide, type: 'in' | 'out', direction: NgbSlideEventDirection) {
    const slideId = slide.id;
    const slideElement = this._getSlideElement(slideId);
    if (type === 'in') {
      this.activeId = slideElement.id;
      this._inTransition.show(
          slideElement, {enableAnimation: this.enableAnimation, data: {direction: direction, slideId: slideId}});
    } else {
      this._outTransition.show(
          slideElement, {enableAnimation: this.enableAnimation, data: {direction: direction, slideId: slideId}});
    }
  }

  ngAfterContentInit() {
    // setInterval() doesn't play well with SSR and protractor,
    // so we should run it in the browser and outside Angular

    if (!this.activeId) {
      this._ngZone.onStable.pipe(take(1)).subscribe(() => {
        if (this.slides) {
          this.activeId = this.slides.length ? this.slides.first.id : null;
        }
        this._toggleActive(this.activeId, true);
      });
    }

    if (isPlatformBrowser(this._platformId)) {
      this._ngZone.runOutsideAngular(() => {
        this._start$
            .pipe(
                map(() => this.interval), filter(interval => interval > 0 && this.slides.length > 0),
                switchMap(interval => timer(interval).pipe(takeUntil(merge(this._stop$, this._destroy$)))))
            .subscribe(() => this._ngZone.run(() => this.next()));

        this._start$.next();
      });
    }

    this.slides.changes.pipe(takeUntil(this._destroy$)).subscribe(() => this._cd.markForCheck());
  }

  ngOnDestroy() { this._destroy$.next(); }

  ngOnChanges(changes) {
    if ('interval' in changes && !changes['interval'].isFirstChange()) {
      this._start$.next();
    }
    const activeIdChanges = changes['activeId'];
    if (activeIdChanges) {
      this._cycleToSelected(activeIdChanges.currentValue, NgbSlideEventDirection.RIGHT);
    }
  }

  /**
   * Navigates to a slide with the specified identifier.
   */
  select(slideId: string) { this._cycleToSelected(slideId, this._getSlideEventDirection(this.activeId, slideId)); }

  /**
   * Navigates to the previous slide.
   */
  prev() { this._cycleToSelected(this._getPrevSlide(this.activeId), NgbSlideEventDirection.RIGHT); }

  /**
   * Navigates to the next slide.
   */
  next() { this._cycleToSelected(this._getNextSlide(this.activeId), NgbSlideEventDirection.LEFT); }

  /**
   * Pauses cycling through the slides.
   */
  pause() { this._stop$.next(); }

  /**
   * Restarts cycling through the slides from left to right.
   */
  cycle() { this._start$.next(); }

  private _cycleToSelected(slideIdx: string, direction: NgbSlideEventDirection) {
    let selectedSlide = this._getSlideById(slideIdx);
    if (selectedSlide && selectedSlide.id !== this.activeId) {
      this.slide.emit({prev: this.activeId, current: selectedSlide.id, direction: direction});

      const activeSlide = this._getSlideById(this.activeId);
      if (activeSlide) {
        this._runTransition(activeSlide, 'out', direction);
      }

      this._runTransition(selectedSlide, 'in', direction);

      this._start$.next();
      this.activeId = selectedSlide.id;
      // Required to update the indicators
      this._cd.detectChanges();
    }

    // we get here after the interval fires or any external API call like next(), prev() or select()
    this._cd.markForCheck();
  }

  private _toggleActive(slideId: string, isActive: boolean) {
    const slideElement = this._getSlideElement(slideId);
    const slideIndicatorElement = this._getSlideIndicatorElement(slideId);
    if (slideElement) {
      if (isActive) {
        this._renderer.addClass(slideElement, 'active');
        if (slideIndicatorElement) {
          this._renderer.addClass(slideIndicatorElement, 'active');
        }
      } else {
        this._renderer.removeClass(slideElement, 'active');
        if (slideIndicatorElement) {
          this._renderer.removeClass(slideIndicatorElement, 'active');
        }
      }
    }
  }

  private _getSlideEventDirection(currentActiveSlideId: string, nextActiveSlideId: string): NgbSlideEventDirection {
    const currentActiveSlideIdx = this._getSlideIdxById(currentActiveSlideId);
    const nextActiveSlideIdx = this._getSlideIdxById(nextActiveSlideId);

    return currentActiveSlideIdx > nextActiveSlideIdx ? NgbSlideEventDirection.RIGHT : NgbSlideEventDirection.LEFT;
  }

  private _getSlideById(slideId: string): NgbSlide {
    slideId = '' + slideId;
    return this.slides ? this.slides.find(slide => slide.id === slideId) : null;
  }

  private _getSlideIdxById(slideId: string): number {
    return this.slides.toArray().indexOf(this._getSlideById(slideId));
  }

  private _getNextSlide(currentSlideId: string): string {
    const slideArr = this.slides.toArray();
    const currentSlideIdx = this._getSlideIdxById(currentSlideId);
    const isLastSlide = currentSlideIdx === slideArr.length - 1;

    return isLastSlide ? (this.wrap ? slideArr[0].id : slideArr[slideArr.length - 1].id) :
                         slideArr[currentSlideIdx + 1].id;
  }

  private _getPrevSlide(currentSlideId: string): string {
    const slideArr = this.slides.toArray();
    const currentSlideIdx = this._getSlideIdxById(currentSlideId);
    const isFirstSlide = currentSlideIdx === 0;

    return isFirstSlide ? (this.wrap ? slideArr[slideArr.length - 1].id : slideArr[0].id) :
                          slideArr[currentSlideIdx - 1].id;
  }

  private _getSlideElement(tabId: string): HTMLElement {
    return this._element.nativeElement.querySelector(`#ngb-slide-${tabId}`);
  }
  private _getSlideIndicatorElement(tabId: string): HTMLElement {
    return this._element.nativeElement.querySelector(`#ngb-slide-indicator-${tabId}`);
  }
}

/**
 * A slide change event emitted right after the slide transition is completed.
 */
export interface NgbSlideEvent {
  /**
   * The previous slide id.
   */
  prev: string;

  /**
   * The current slide id.
   */
  current: string;

  /**
   * The slide event direction.
   *
   * Possible values are `'left' | 'right'`.
   */
  direction: NgbSlideEventDirection;
}

/**
 * Defines the carousel slide transition direction.
 */
export enum NgbSlideEventDirection {
  LEFT = <any>'left',
  RIGHT = <any>'right'
}

export const NGB_CAROUSEL_DIRECTIVES = [NgbCarousel, NgbSlide];
