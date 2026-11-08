import { ExerciseId, RoutineId } from './exercise-catalog';
import {
  bestPullUps,
  changeLevel,
  endDeload,
  exerciseStatus,
  finishSession,
  isDeloadActive,
  isDeloadDue,
  nextRoutine,
  planFor,
  recordMaxTest,
  recordSet,
  snoozeDeload,
  startDeload,
  visibleExercises,
} from './progression';
import { emptyState, ExerciseProgress, normalizeState, TrainingState } from './training-state';

const NOW = new Date(2026, 10, 8, 18, 0).getTime();

/** Anota las mismas repeticiones en varias series de un ejercicio y guarda la sesión. */
function trainAndSave(state: TrainingState, routine: RoutineId, id: ExerciseId, values: number[]) {
  let current = state;
  values.forEach((value, index) => (current = recordSet(current, routine, id, index, value, NOW)));
  return finishSession(current, NOW)!;
}

function progress(step: number, changes: Partial<ExerciseProgress> = {}): ExerciseProgress {
  return { step, hits: 0, last: null, prev: null, testDue: false, seen: true, ...changes };
}

describe('progression', () => {
  it('alternates routines A and B', () => {
    const state = emptyState();
    expect(nextRoutine(state, null)).toBe('A');

    const afterA = trainAndSave(state, 'A', 'dips', [6, 6, 6]).state;
    expect(nextRoutine(afterA, null)).toBe('B');
    expect(nextRoutine(afterA, 'A')).toBe('A');
  });

  it('does nothing when there is no session in progress', () => {
    expect(finishSession(emptyState(), NOW)).toBeNull();
  });

  it('levels up after enough sessions with every set at the top', () => {
    // Fondos, nivel 1: 3 × 6-10. Hacen falta 2 sesiones con 3 × 10.
    const first = trainAndSave(emptyState(), 'A', 'dips', [10, 10, 10]);
    expect(first.state.prog.dips?.hits).toBe(1);
    expect(first.summary.results.find((r) => r.id === 'dips')?.kind).toBe('edge');

    const second = trainAndSave(first.state, 'A', 'dips', [10, 10, 10]);
    expect(second.state.prog.dips).toMatchObject({ step: 1, hits: 0, last: 'up' });
    expect(second.state.sessions.at(-1)?.ups).toEqual(['dips']);
  });

  it('resets the counter when a set falls short', () => {
    const first = trainAndSave(emptyState(), 'A', 'dips', [10, 10, 10]);
    const second = trainAndSave(first.state, 'A', 'dips', [10, 9, 10]);
    expect(second.state.prog.dips).toMatchObject({ step: 0, hits: 0, last: 'fail' });
  });

  it('asks for a max test after mastering 5 × 5 pull-ups', () => {
    const state = emptyState();
    state.prog.pull = progress(2, { hits: 2 });

    const result = trainAndSave(state, 'A', 'pull', [5, 5, 5, 5, 5]);
    expect(result.state.prog.pull?.testDue).toBe(true);
    expect(planFor(result.state, 'pull', NOW)).toMatchObject({ isTest: true, sets: 1 });
  });

  it('moves to weighted pull-ups with 8 or more in the test', () => {
    const state = emptyState();
    state.prog.pull = progress(2, { testDue: true });

    expect(recordMaxTest(state, 8, NOW).state.prog.pull).toMatchObject({
      step: 3,
      last: 'test-up',
      testDue: false,
    });
    expect(recordMaxTest(state, 6, NOW).state.prog.pull).toMatchObject({
      step: 2,
      last: 'test-hold',
      lastTest: 6,
    });
  });

  it('halves the sets during a deload week', () => {
    const state = emptyState();
    state.deload.until = NOW + 1000;
    expect(planFor(state, 'pull', NOW).sets).toBe(3); // 5 series → 3
  });

  it('hides negatives once pull-ups reach 5 × 5', () => {
    const state = emptyState();
    expect(visibleExercises(state, 'A')).toContain('neg');
    state.prog.pull = progress(2);
    expect(visibleExercises(state, 'A')).not.toContain('neg');
  });

  it('ignores weighted sessions for the best pull-up mark', () => {
    const state = emptyState();
    state.tests.push({ date: NOW, reps: 7 });
    state.sessions.push({ type: 'A', date: NOW, entries: { pull: [10] }, steps: { pull: 3 } });
    expect(bestPullUps(state)).toBe(7);
  });

  it('does not modify the state it receives', () => {
    const state = emptyState();
    recordSet(state, 'A', 'pull', 0, 3, NOW);
    expect(state.draft).toBeNull();
  });
});

describe('normalizeState', () => {
  it('keeps levels and tests from a backup', () => {
    const state = normalizeState({
      v: 2,
      sessions: [],
      tests: [{ date: NOW, reps: 7 }],
      prog: { pull: { step: 2, hits: 1, last: 'hold', prev: 1, testDue: false, seen: true } },
    });
    expect(state.prog.pull?.step).toBe(2);
    expect(state.tests.length).toBe(1);
  });

  it('drops sessions with an unknown routine', () => {
    const state = normalizeState({
      v: 2,
      sessions: [
        { type: 'A', date: NOW, entries: {} },
        { type: 'Z', date: NOW, entries: {} },
      ],
    });
    expect(state.sessions.length).toBe(1);
  });
});

describe('deload', () => {
  const DAY = 86_400_000;

  function stateStartedDaysAgo(days: number): TrainingState {
    const state = emptyState();
    state.sessions.push({ type: 'A', date: NOW - days * DAY, entries: {} });
    return state;
  }

  it('is proposed 6 weeks after the first session', () => {
    expect(isDeloadDue(emptyState(), NOW)).toBe(false);
    expect(isDeloadDue(stateStartedDaysAgo(41), NOW)).toBe(false);
    expect(isDeloadDue(stateStartedDaysAgo(42), NOW)).toBe(true);
  });

  it('lasts one week once started, and can be ended early', () => {
    const started = startDeload(stateStartedDaysAgo(50), NOW);
    expect(isDeloadActive(started, NOW + 6 * DAY)).toBe(true);
    expect(isDeloadActive(started, NOW + 8 * DAY)).toBe(false);
    expect(isDeloadDue(started, NOW + 8 * DAY)).toBe(false); // cuenta desde la última descarga
    expect(isDeloadActive(endDeload(started), NOW)).toBe(false);
  });

  it('is not proposed again for 3 days after "not now"', () => {
    const snoozed = snoozeDeload(stateStartedDaysAgo(50), NOW);
    expect(isDeloadDue(snoozed, NOW + 2 * DAY)).toBe(false);
    expect(isDeloadDue(snoozed, NOW + 4 * DAY)).toBe(true);
  });
});

describe('changeLevel', () => {
  it('moves one level and resets the counter', () => {
    const state = emptyState();
    state.prog.push = progress(0, { hits: 1 });

    const next = changeLevel(state, 'push', 1);
    expect(next.prog.push).toMatchObject({ step: 1, hits: 0, last: 'manual', prev: 0 });
    expect(exerciseStatus(next, 'push', NOW).text).toBe('Nivel cambiado a mano. Contador a cero.');
  });

  it('does not go below the first level or above the last one', () => {
    const state = emptyState();
    expect(changeLevel(state, 'push', -1)).toBe(state);
    state.prog.push = progress(2); // Flexiones tiene 3 niveles
    expect(changeLevel(state, 'push', 1)).toBe(state);
  });
});
