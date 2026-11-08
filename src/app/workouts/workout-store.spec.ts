import { TestBed } from '@angular/core/testing';
import { WorkoutStore } from './workout-store';

describe('WorkoutStore', () => {
  let store: WorkoutStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(WorkoutStore);
  });

  it('starts empty', () => {
    expect(store.entries()).toEqual([]);
  });

  it('adds an entry and saves it in localStorage', () => {
    store.add({ date: '2026-11-08', exercise: 'Sentadilla', sets: 3, reps: 10, weightKg: 60 });

    expect(store.entries().length).toBe(1);
    expect(store.entries()[0].id).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('rocky.workouts')!).length).toBe(1);
  });

  it('removes an entry', () => {
    store.add({ date: '2026-11-08', exercise: 'Sentadilla', sets: 3, reps: 10, weightKg: 60 });
    store.remove(store.entries()[0].id);

    expect(store.entries()).toEqual([]);
  });

  it('lists exercise names without duplicates', () => {
    store.add({ date: '2026-11-08', exercise: 'Sentadilla', sets: 3, reps: 10, weightKg: 60 });
    store.add({ date: '2026-11-09', exercise: 'Sentadilla', sets: 3, reps: 8, weightKg: 65 });
    store.add({ date: '2026-11-09', exercise: 'Dominadas', sets: 4, reps: 6, weightKg: 0 });

    expect(store.exerciseNames()).toEqual(['Dominadas', 'Sentadilla']);
  });
});
