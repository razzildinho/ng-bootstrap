import {Renderer2} from '@angular/core';
import {Injectable} from '@angular/core';
import {ReplaySubject, Observable, Subject, AsyncSubject} from 'rxjs';

const EMPTY_CLASSNAME = '_noClass';

interface TransitionContext {
  transitionCounter?: number;
  eventsRemoval: Array<Function>;

  subject: Subject<any>;
  promiseResolve?(data?: any);
}

export interface TransitionDefinition {
  classname?: string;
  beforeTransitionStart?(element: HTMLElement, options: TransitionOptions);
  afterTransitionStart?(element: HTMLElement, options: TransitionOptions): boolean;
  afterTransitionEnd?(element: HTMLElement, options: TransitionOptions);
}

export interface TransitionOptions {
  enableAnimation?: boolean;
  data?: any;
  callback?(data?: any);
}

export class Transition {
  transitionDef: TransitionDefinition;

  selectorOrElement: any;
  direction?: 'show' | 'hide';

  private _contexts = new Map<any, TransitionContext>();

  constructor(transitionDef: TransitionDefinition, private _renderer: Renderer2) { this.transitionDef = transitionDef; }

  show(element: HTMLElement, options: TransitionOptions = {}): Observable<any> {
    this.direction = 'show';
    return this._run(element, options);
  }

  hide(element: HTMLElement, options: TransitionOptions = {}): Observable<any> {
    this.direction = 'hide';
    return this._run(element, options);
  }

  reflow(element: HTMLElement) { return (element || document.body).offsetHeight; }

  destroy() { this._removeEvents(); }

  private _run(element: HTMLElement, options: TransitionOptions) {
    const subject = new AsyncSubject();

    const enableAnimation = options.enableAnimation;


    let context: TransitionContext = this._contexts.get(element);
    if (!context) {
      context = {transitionCounter: 0, subject, eventsRemoval: []};
      this._contexts.set(element, context);
    }
    context.subject = subject;

    const switchEffect = (enableAnimation ? this._runWithAnimation : this._runNoAnimation).bind(this);
    switchEffect(element, options);

    return subject.asObservable();
  }

  private _runNoAnimation(element: HTMLElement, options: TransitionOptions) {
    const adding = this.direction === 'show';
    const renderer = this._renderer;
    const transitionDef = this.transitionDef;

    // if (effectDef.beforeAnimationStart) {
    //   effectDef.beforeAnimationStart(effectOptions);
    // }

    const classname = transitionDef.classname;
    if (classname) {
      if (adding) {
        renderer.addClass(element, classname);
      } else {
        renderer.removeClass(element, classname);
      }
    }
    // if (effectDef.beforeAnimationStart) {
    //   effectDef.beforeAnimationStart(effectOptions);
    // }

    this._transitionEnd(element, options);
  }

  private _runWithAnimation(element: HTMLElement, options: TransitionOptions) {
    const adding = this.direction === 'show';

    // this._initAction(effectOptions);
    const renderer = this._renderer;
    const transitionDef = this.transitionDef;

    const classnameRegExp = new RegExp('\\b' + transitionDef.classname + '\\b');
    const currentClassName = element.className;
    const hasClass = classnameRegExp.test(currentClassName);

    if (transitionDef.beforeTransitionStart) {
      transitionDef.beforeTransitionStart(element, options);
    }

    this.reflow(element);

    this._addEvents(element, options);
    const classname = transitionDef.classname;
    if (classname) {
      if (adding) {
        renderer.addClass(element, classname);
      } else {
        renderer.removeClass(element, classname);
      }
    }

    this.reflow(element);

    if (transitionDef.afterTransitionStart) {
      const animationStarted = transitionDef.afterTransitionStart(element, options) !== false;
      if (!animationStarted) {
        this._transitionEnd(element, options);
      }
    }
  }

  private _addEvents(element: HTMLElement, options: TransitionOptions) {
    const context = this._contexts.get(element);
    this._removeEvents(context);
    const events = context.eventsRemoval = [];
    context.transitionCounter = 0;
    const renderer = this._renderer;
    events.push(renderer.listen(element, 'transitionstart', this._transitionStart.bind(this, element, options)));
    events.push(renderer.listen(element, 'transitionend', this._transitionEnd.bind(this, element, options)));
  }

  private _removeEvents(context?: TransitionContext) {
    if (context) {
      const events = context.eventsRemoval;
      const length = events.length;
      for (let i = 0; i < length; i++) {
        events[i]();
      }

      context.eventsRemoval = [];
    }
  }

  private _transitionStart(context: TransitionContext) { context.transitionCounter++; }

  private _transitionEnd(element: HTMLElement, options: TransitionOptions) {
    const context = this._contexts.get(element);
    if (context) {
      context.transitionCounter--;
      const counter = context.transitionCounter;
      if (counter < 1) {
        this._removeEvents(context);
        this._contexts.delete(element);
        context.transitionCounter = 0;

        const transitionDef = this.transitionDef;

        let callbackParameters;
        if (transitionDef.afterTransitionEnd) {
          callbackParameters = transitionDef.afterTransitionEnd(element, options);
        }

        context.subject.next(callbackParameters);
        context.subject.complete();
      }
    }
  }
}
