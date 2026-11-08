import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NumberSheet } from '../shared/number-sheet/number-sheet';
import { describeLevelFull, EXERCISES, ROUTINE_IDS, ROUTINES } from '../training/exercise-catalog';
import { bestPullUps, progressOf } from '../training/progression';
import { TrainingStore } from '../training/training-store';

/** Objetivo de dominadas seguidas. */
const GOAL = 10;

@Component({
  selector: 'app-progress-page',
  imports: [DatePipe, NumberSheet],
  templateUrl: './progress-page.html',
  styleUrl: './progress-page.css',
})
export class ProgressPage {
  private readonly store = inject(TrainingStore);

  protected readonly testSheetOpen = signal(false);
  protected readonly testMessage = signal('');
  protected readonly backupMessage = signal('');

  protected readonly best = computed(() => bestPullUps(this.store.state()));
  protected readonly goal = GOAL;
  protected readonly goalDots = computed(() =>
    Array.from({ length: GOAL }, (_, i) => ({ number: i + 1, done: i < this.best() })),
  );

  /** Últimos 10 tests, del más reciente al más antiguo. */
  protected readonly tests = computed(() => this.store.state().tests.slice(-10).reverse());

  /** Nivel de cada ejercicio, agrupado por rutina (sin las negativas, que no tienen niveles). */
  protected readonly levels = computed(() => {
    const state = this.store.state();
    return ROUTINE_IDS.map((routineId) => ({
      title: `${ROUTINES[routineId].name} · ${ROUTINES[routineId].focus}`,
      rows: ROUTINES[routineId].exerciseIds
        .filter((id) => id !== 'neg')
        .map((id) => {
          const exercise = EXERCISES[id];
          const step = progressOf(state, id).step;
          return {
            id,
            name: exercise.name,
            description: describeLevelFull(id, step),
            levelText:
              exercise.kind === 'ladder'
                ? `Nivel ${step + 1} de ${exercise.ladder.length}`
                : `Nivel ${step + 1}`,
            segments: exercise.kind === 'ladder' ? exercise.ladder.map((_, i) => i <= step) : [],
          };
        }),
    }));
  });

  /** Últimas 40 sesiones, de la más reciente a la más antigua. */
  protected readonly history = computed(() =>
    this.store
      .state()
      .sessions.slice(-40)
      .reverse()
      .map((session) => ({
        key: session.date,
        name: ROUTINES[session.type].name,
        date: session.date,
        pullUps: [...(session.entries.pull ?? []), ...(session.entries.chin ?? [])].reduce(
          (a, b) => a + b,
          0,
        ),
        deload: !!session.deload,
        ups: session.ups?.length ?? 0,
      })),
  );

  protected saveTest(reps: number): void {
    const result = this.store.recordMaxTest(reps);
    this.testSheetOpen.set(false);
    this.testMessage.set(result ? result.text : `Test anotado: ${reps} dominadas.`);
  }

  protected exportBackup(): void {
    const json = this.store.exportBackup();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rocky-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    this.backupMessage.set('Copia descargada.');
  }

  protected async importBackup(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (
      this.store.state().sessions.length &&
      !confirm('La copia sustituirá todos tus datos actuales. ¿Seguir?')
    ) {
      return;
    }
    try {
      const { sessions, tests } = this.store.importBackup(await file.text());
      this.backupMessage.set(
        `Copia importada: ${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'} y ${tests} ${tests === 1 ? 'test' : 'tests'}.`,
      );
    } catch {
      this.backupMessage.set('Ese archivo no es una copia de seguridad de Rocky.');
    }
  }
}
