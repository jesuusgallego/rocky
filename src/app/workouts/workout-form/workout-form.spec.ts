import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkoutForm } from './workout-form';

describe('WorkoutForm', () => {
  let component: WorkoutForm;
  let fixture: ComponentFixture<WorkoutForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkoutForm],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkoutForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
