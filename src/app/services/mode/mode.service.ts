import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ModeService {
  private modeSubject = new BehaviorSubject<'map' | 'list'>('map');

  // Observable to subscribe
  mode$ = this.modeSubject.asObservable();

  // Get current value
  mode(): 'map' | 'list' {
    return this.modeSubject.value;
  }

  // Set mode
  setMode(mode: 'map' | 'list') {
    this.modeSubject.next(mode);
  }

  // Toggle mode
  toggleMode() {
    this.setMode(this.mode() === 'map' ? 'list' : 'map');
  }
}
