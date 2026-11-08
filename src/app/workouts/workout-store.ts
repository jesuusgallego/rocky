import { computed, Service, signal } from '@angular/core';
import { NewWorkoutEntry, WorkoutEntry } from './workout-entry';

const STORAGE_KEY = 'rocky.workouts';

/**
 * Único sitio de la app que guarda y modifica los entrenamientos.
 * Los componentes leen de aquí y piden cambios con add() y remove().
 */
@Service()
export class WorkoutStore {
  // Signal privado: solo este servicio puede modificar la lista.
  private readonly entriesState = signal<WorkoutEntry[]>(loadEntries());

  /** Lista de registros, de solo lectura para los componentes. */
  readonly entries = this.entriesState.asReadonly();

  /** Nombres de ejercicios ya usados, sin repetir, para sugerirlos en el formulario. */
  readonly exerciseNames = computed(() =>
    [...new Set(this.entries().map((entry) => entry.exercise))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    ),
  );

  add(newEntry: NewWorkoutEntry): void {
    const entry: WorkoutEntry = { ...newEntry, id: crypto.randomUUID() };
    this.entriesState.update((entries) => [...entries, entry]);
    this.save();
  }

  remove(id: string): void {
    this.entriesState.update((entries) => entries.filter((entry) => entry.id !== id));
    this.save();
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entriesState()));
  }
}

function loadEntries(): WorkoutEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as WorkoutEntry[]) : [];
  } catch {
    // Si los datos guardados están corruptos, empezamos con la lista vacía.
    return [];
  }
}
