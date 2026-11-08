import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NumberSheet } from '../shared/number-sheet/number-sheet';
import { EXERCISES, ExerciseId, ROUTINE_IDS, ROUTINES, Unit } from '../training/exercise-catalog';
import {
  bestPullUps,
  dayDiff,
  exerciseStatus,
  isDeloadActive,
  lastSession,
  lastValue,
  planFor,
  progressOf,
  ResultKind,
  SessionSummary,
  visibleExercises,
} from '../training/progression';
import { TrainingStore } from '../training/training-store';
import { ExerciseCard, ExerciseCardData } from './exercise-card/exercise-card';

/** Serie que se está anotando en el panel. */
interface OpenSet {
  id: ExerciseId;
  index: number;
  title: string;
  subtitle: string;
  unit: Unit;
  initialValue: number;
  canRemove: boolean;
}

/** Qué mostrar arriba: entrenar, sesión en curso, ya entrenaste hoy o ayer. */
type DayMode = 'train' | 'live' | 'done' | 'rest';

const RING_LENGTH = 169.6; // perímetro del círculo de progreso (2 · π · 27)

@Component({
  selector: 'app-today-page',
  imports: [DatePipe, ExerciseCard, NumberSheet],
  templateUrl: './today-page.html',
  styleUrl: './today-page.css',
})
export class TodayPage {
  protected readonly store = inject(TrainingStore);
  protected readonly routineIds = ROUTINE_IDS;
  protected readonly now = Date.now();
  protected readonly icons: Record<ResultKind, string> = {
    up: '↑',
    test: '!',
    edge: '→',
    fail: '↻',
    hold: '·',
    plain: '·',
    skip: '–',
  };

  protected readonly openSet = signal<OpenSet | null>(null);
  protected readonly summary = signal<SessionSummary | null>(null);

  /** Todo lo que se ve en la pantalla, calculado a partir del estado. */
  protected readonly view = computed(() => {
    const state = this.store.state();
    const routineId = this.store.routine();
    const routine = ROUTINES[routineId];
    const now = Date.now();
    const entries = state.draft?.entries ?? {};
    const last = lastSession(state);
    const best = bestPullUps(state);

    let mode: DayMode = 'train';
    if (state.draft) mode = 'live';
    else if (last && dayDiff(last.date, now) === 0) mode = 'done';
    else if (last && dayDiff(last.date, now) === 1) mode = 'rest';

    const cards: ExerciseCardData[] = visibleExercises(state, routineId).map((id, position) => ({
      id,
      position,
      exercise: EXERCISES[id],
      step: progressOf(state, id).step,
      plan: planFor(state, id, now),
      status: exerciseStatus(state, id, now),
      values: entries[id] ?? [],
      bestPullUps: best,
    }));

    const totalSets = cards.reduce((sum, card) => sum + card.plan.sets, 0);
    const doneSets = cards.reduce(
      (sum, card) => sum + Math.min(card.values.length, card.plan.sets),
      0,
    );

    let title = routine.name;
    let subtitle = `${routine.focus} · ${cards.length} ejercicios · unos 50 min`;
    if (mode === 'rest') {
      title = 'Descanso';
      subtitle = `Entrenaste ayer. Mañana toca la ${routineId}.`;
    } else if (mode === 'done' && last) {
      title = 'Hecho por hoy';
      subtitle = `${ROUTINES[last.type].name} guardada. La próxima es la ${routineId}.`;
    }

    return {
      routineId,
      routine,
      mode,
      title,
      subtitle,
      cards,
      totalSets,
      doneSets,
      exercisesStarted: cards.filter((card) => card.values.length).length,
      ringOffset: (RING_LENGTH * (1 - (totalSets ? doneSets / totalSets : 0))).toFixed(1),
      later: mode === 'rest' || mode === 'done',
      deload: isDeloadActive(state, now),
    };
  });

  /** Resumen "¿Subo hoy?": ejercicios agrupados según lo que les va a pasar. */
  protected readonly verdict = computed(() => {
    const { cards, deload } = this.view();
    if (deload)
      return [
        {
          kind: 'plain' as const,
          title: 'Descarga',
          text: 'Esta semana no sube nada. Mitad de series.',
        },
      ];

    const names = (kind: string) =>
      cards.filter((card) => card.status.kind === kind).map((card) => card.exercise.name);
    const rows: { kind: ResultKind; title: string; text: string }[] = [];
    if (names('up').length) rows.push({ kind: 'up', title: 'Subes', text: names('up').join(', ') });
    if (names('test').length)
      rows.push({
        kind: 'test',
        title: 'Test de máximo',
        text: 'Dominadas: una sola serie al fallo',
      });
    if (names('edge').length)
      rows.push({ kind: 'edge', title: 'Si completas, subes', text: names('edge').join(', ') });
    if (names('fail').length)
      rows.push({ kind: 'fail', title: 'Repites objetivo', text: names('fail').join(', ') });
    if (!rows.length) {
      rows.push({
        kind: 'plain',
        title: 'Hoy no sube nada',
        text: 'Cumple los objetivos y ve sumando sesiones completas.',
      });
    }
    return rows;
  });

  protected selectSet(card: ExerciseCardData, requestedIndex: number): void {
    const { id, plan, values, exercise } = card;
    // No se puede saltar series: si tocas la 3 sin haber hecho la 2, se anota la 2.
    const index = Math.min(requestedIndex, values.length);
    const current = values[index];
    const suggested = plan.isTest
      ? Math.max(1, card.bestPullUps)
      : (lastValue(this.store.state(), id, index) ?? (plan.min === plan.max ? plan.max : plan.min));
    const unitText = exercise.unit === 'seconds' ? ' s' : '';

    this.openSet.set({
      id,
      index,
      title: exercise.name,
      subtitle: plan.isTest
        ? 'Test de máximo: una serie hasta el fallo, bien descansado.'
        : `Serie ${index + 1} de ${plan.sets} · tope ${plan.max}${unitText}${plan.perSide ? ' por lado' : ''}`,
      unit: exercise.unit,
      initialValue: current ?? suggested,
      canRemove: current !== undefined,
    });
  }

  protected saveSet(set: OpenSet, value: number): void {
    this.store.recordSet(set.id, set.index, value);
    this.openSet.set(null);
  }

  protected removeSet(set: OpenSet): void {
    this.store.removeSet(set.id, set.index);
    this.openSet.set(null);
  }

  protected finish(): void {
    this.summary.set(this.store.finishSession());
    window.scrollTo(0, 0);
  }

  protected discard(): void {
    if (confirm('¿Descartar la sesión? Se borran las series anotadas.'))
      this.store.discardSession();
  }

  protected exerciseName(id: ExerciseId): string {
    return EXERCISES[id].name;
  }
}
