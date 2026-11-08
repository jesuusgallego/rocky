/** Un ejercicio registrado en un día concreto. */
export interface WorkoutEntry {
  id: string;
  /** Fecha en formato AAAA-MM-DD (el mismo que usa <input type="date">). */
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  /** 0 significa peso corporal. */
  weightKg: number;
}

/** Lo que hace falta para crear un registro: todo menos el id, que lo genera el servicio. */
export type NewWorkoutEntry = Omit<WorkoutEntry, 'id'>;
