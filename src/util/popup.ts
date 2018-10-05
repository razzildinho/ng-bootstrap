import {
  Injector,
  TemplateRef,
  ViewRef,
  ViewContainerRef,
  Renderer2,
  ComponentRef,
  ComponentFactoryResolver,
  NgZone
} from '@angular/core';
import {Transition} from './transition/ngbTransition';
import {take} from 'rxjs/operators';
import {of, Observable} from 'rxjs';

export class ContentRef {
  constructor(public nodes: any[], public viewRef?: ViewRef, public componentRef?: ComponentRef<any>) {}
}

export class PopupService<T> {
  private _windowRef: ComponentRef<T>;
  private _contentRef: ContentRef;

  private _enableAnimation = true;
  private _fadingTransition: Transition;

  constructor(
      private _type: any, private _injector: Injector, private _viewContainerRef: ViewContainerRef,
      private _renderer: Renderer2, private _ngZone: NgZone,
      private _componentFactoryResolver: ComponentFactoryResolver) {
    this._fadingTransition = new Transition({classname: 'show'}, this._renderer);
  }

  open(content?: string | TemplateRef<any>, context?: any, enableAnimation = true): ComponentRef<T> {
    if (!this._windowRef) {
      this._contentRef = this._getContentRef(content, context);
      this._windowRef = this._viewContainerRef.createComponent(
          this._componentFactoryResolver.resolveComponentFactory<T>(this._type), 0, this._injector,
          this._contentRef.nodes);
    }

    const element = this._windowRef.location.nativeElement;

    this._ngZone.onStable.pipe(take(1)).subscribe(
        () => { this._fadingTransition.show(element, {enableAnimation: enableAnimation}); });

    return this._windowRef;
  }

  close(enableAnimation = true): Observable<any> {
    let observable;
    if (this._windowRef) {
      const element = this._windowRef.location.nativeElement;
      observable = this._fadingTransition.hide(element, {enableAnimation: enableAnimation});
      observable.pipe(take(1)).subscribe(() => {
        this._viewContainerRef.remove(this._viewContainerRef.indexOf(this._windowRef.hostView));
        this._windowRef = null;

        if (this._contentRef.viewRef) {
          this._viewContainerRef.remove(this._viewContainerRef.indexOf(this._contentRef.viewRef));
          this._contentRef = null;
        }
      });
    } else {
      observable = of();
    }
    return observable;
  }

  private _getContentRef(content: string | TemplateRef<any>, context?: any): ContentRef {
    if (!content) {
      return new ContentRef([]);
    } else if (content instanceof TemplateRef) {
      const viewRef = this._viewContainerRef.createEmbeddedView(<TemplateRef<T>>content, context);
      return new ContentRef([viewRef.rootNodes], viewRef);
    } else {
      return new ContentRef([[this._renderer.createText(`${content}`)]]);
    }
  }
}
