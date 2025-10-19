import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListingsMapComponent } from './listings-map.component';

describe('ListingsMapComponent', () => {
  let component: ListingsMapComponent;
  let fixture: ComponentFixture<ListingsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingsMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListingsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
