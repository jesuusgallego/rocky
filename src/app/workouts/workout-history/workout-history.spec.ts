import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkoutHistory } from './workout-history';

describe('WorkoutHistory', () => {
  let component: WorkoutHistory;
  let fixture: ComponentFixture<WorkoutHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkoutHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
