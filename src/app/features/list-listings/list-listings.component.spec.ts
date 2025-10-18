import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListListingsComponent } from './list-listings.component';

describe('ListListingsComponent', () => {
  let component: ListListingsComponent;
  let fixture: ComponentFixture<ListListingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListListingsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListListingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
