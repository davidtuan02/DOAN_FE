import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterDetailComponent } from './filter-detail.component';

describe('FilterDetailComponent', () => {
  let component: FilterDetailComponent;
  let fixture: ComponentFixture<FilterDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterDetailComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FilterDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
