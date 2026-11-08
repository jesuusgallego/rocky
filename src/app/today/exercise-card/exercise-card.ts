import { Component, computed, input, output } from '@angular/core';
import {
  describeLevelFull,
  Exercise,
  ExerciseId,
  formatRest,
  formatTarget,
} from '../../training/exercise-catalog';
import { ExerciseStatus, Plan } from '../../training/progression';

/** Todo lo que la tarjeta necesita para dibujarse. Lo prepara la pantalla Hoy. */
export interface ExerciseCardData {
  id: ExerciseId;
  position: number;
  exercise: Exercise;
  step: number;
  plan: Plan;
  status: ExerciseStatus;
  values: readonly number[];
  bestPullUps: number;
}

interface SetButton {
  index: number;
  text: string;
  label: string;
  result: 'empty' | 'top' | 'low';
  record: boolean;
}

@Component({
  selector: 'app-exercise-card',
  templateUrl: './exercise-card.html',
  styleUrl: './exercise-card.css',
})
export class ExerciseCard {
  readonly data = input.required<ExerciseCardData>();
  /** Se emite con el número de serie que el usuario quiere anotar o corregir. */
  readonly setSelected = output<number>();

  protected readonly isDone = computed(() => this.data().values.length >= this.data().plan.sets);
  protected readonly target = computed(() =>
    formatTarget(this.data().plan, this.data().exercise.unit),
  );
  protected readonly rest = computed(() => formatRest(this.data().exercise.restSeconds));

  protected readonly dots = computed(() => {
    const dots = this.data().status.dots;
    return dots ? Array.from({ length: dots.total }, (_, i) => i < dots.done) : [];
  });

  /** Una casilla por serie: vacía, al tope o por debajo. */
  protected readonly sets = computed<SetButton[]>(() => {
    const { id, plan, values, exercise, bestPullUps } = this.data();
    const mark = exercise.unit === 'seconds' ? '″' : '';
    return Array.from({ length: plan.sets }, (_, index) => {
      const value = values[index];
      if (value === undefined) {
        return {
          index,
          text: plan.isTest ? 'Máx' : String(index + 1),
          label: `Anotar serie ${index + 1} de ${exercise.name}`,
          result: 'empty',
          record: false,
        };
      }
      const isBarExercise = id === 'pull' || id === 'chin';
      return {
        index,
        text: value + mark,
        label: `Serie ${index + 1}: ${value}. Toca para corregir`,
        result: plan.isTest || value >= plan.max ? 'top' : 'low',
        record: isBarExercise && !plan.extraKg && value > bestPullUps,
      };
    });
  });

  /** Mensaje al terminar todas las series. */
  protected readonly completion = computed(() => {
    const { plan, values } = this.data();
    if (plan.isTest || values.length < plan.sets) return null;
    const ok = values.slice(0, plan.sets).every((v) => v >= plan.max);
    return { ok, text: ok ? 'Completo al tope' : 'Hecho, pero sin llegar al tope en todas' };
  });

  /** Los niveles de la escalera alrededor del actual. */
  protected readonly ladder = computed(() => {
    const { id, step, exercise } = this.data();
    if (id === 'neg') return [];
    const from = exercise.kind === 'ladder' ? 0 : Math.max(0, step - 2);
    const to = exercise.kind === 'ladder' ? exercise.ladder.length - 1 : step + 2;
    const levels = [];
    for (let index = from; index <= to; index++) {
      levels.push({
        index,
        text: describeLevelFull(id, index),
        past: index < step,
        current: index === step,
      });
    }
    return levels;
  });
}
