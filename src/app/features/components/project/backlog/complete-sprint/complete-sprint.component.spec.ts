import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompleteSprintComponent } from './complete-sprint.component';

describe('CompleteSprintComponent', () => {
  let component: CompleteSprintComponent;
  let fixture: ComponentFixture<CompleteSprintComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompleteSprintComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CompleteSprintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
