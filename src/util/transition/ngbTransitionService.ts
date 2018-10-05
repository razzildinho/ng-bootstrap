import {Injectable, Renderer2} from '@angular/core';
import {Subject, Observable, zip, ReplaySubject} from 'rxjs';
import {take, tap} from 'rxjs/operators';

@Injectable()
export class NgbTransitionService {
  onDestroyObservers = new Map<any, Function>();

  constructor() {}

  onDestroy(element: any, fn: Function) {
    // this._renderer.data.onDestroy(element, fn);
    this.onDestroyObservers.set(element, fn);
  }


  resolveObserversForElement(element: any): Observable<{}[]> {
    const onDestroyFns = this._getOnDestroyObservers(element);
    const length = onDestroyFns.length;

    const observers = [];
    if (length) {
      for (let i = 0; i < length; i++) {
        const observerFactory = onDestroyFns[i];
        const observer = observerFactory();
        observers.push(observer);
      }
    } else {
      const subject = new ReplaySubject();
      observers.push(subject);
      subject.next();
    }

    const allObservers = zip(...observers);
    allObservers.pipe(take(1)).subscribe(() => { this._unregisterOnDestroy(observers); });
    return allObservers;
  }

  /**
   * Get all onDestroy contained in the provided element
   */
  private _getOnDestroyObservers(element): Array<Function> {
    const onDestroy: Array<Function> = [];
    this.onDestroyObservers.forEach((observerFn, pElement) => {
      if (this._inDom(element, pElement)) {
        onDestroy.push(observerFn);
      }
    });

    return onDestroy;
  }

  /**
   * Unregister the Observers given
   */
  private _unregisterOnDestroy(Observers: Array<Function>) {
    const onDestroyObservers = this.onDestroyObservers;
    onDestroyObservers.forEach((observerFn, pElement) => {
      if (Observers.indexOf(observerFn) > -1) {
        onDestroyObservers.delete(pElement);
      }
    });
  }

  /**
   *
   * @param container Return true if element is a child of parent
   * @param element
   */
  private _inDom(container, element) {
    let current = element;
    while (current && current !== document.body) {
      if (current === container) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }
}
