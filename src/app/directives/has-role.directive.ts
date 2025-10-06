import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { AuthService } from '../core/auth/services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private destroy$ = new Subject<void>();

  @Input() appHasRole: 'user' | 'admin' | Array<'user' | 'admin'> = [];

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView() {
    const userRole = this.authService.getUserRole();
    const hasRequiredRole = this.checkRole(userRole);

    if (hasRequiredRole) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }

  private checkRole(userRole: 'user' | 'admin' | null): boolean {
    if (!userRole) return false;

    if (Array.isArray(this.appHasRole)) {
      return this.appHasRole.includes(userRole);
    }

    return this.appHasRole === userRole;
  }
}
