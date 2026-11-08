import { Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, min, required } from '@angular/forms/signals';
import { WorkoutStore } from '../workout-store';

/** Datos del formulario mientras se rellena: los números empiezan vacíos (null). */
interface WorkoutDraft {
  date: string;
  exercise: string;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
}

@Component({
  imports: [FormRoot, FormField],
  selector: 'app-workout-form',
  styleUrl: './workout-form.css',
  templateUrl: './workout-form.html',
})
export class WorkoutForm {
  protected readonly store = inject(WorkoutStore);

  // El modelo: un signal con los datos. El formulario lee y escribe aquí.
  private readonly draft = signal<WorkoutDraft>(emptyDraft(today()));

  // El formulario: el modelo + las reglas de validación + qué hacer al enviar.
  protected readonly workoutForm = form(
    this.draft,
    (field) => {
      required(field.date, { message: 'Elige una fecha' });
      required(field.exercise, { message: 'Escribe el ejercicio' });
      required(field.sets, { message: 'Indica las series' });
      min(field.sets, 1, { message: 'Mínimo 1 serie' });
      required(field.reps, { message: 'Indica las repeticiones' });
      min(field.reps, 1, { message: 'Mínimo 1 repetición' });
      required(field.weightKg, { message: 'Indica el peso (0 si es peso corporal)' });
      min(field.weightKg, 0, { message: 'El peso no puede ser negativo' });
    },
    {
      submission: {
        // Solo se ejecuta si todas las validaciones pasan.
        action: async () => this.save(),
      },
    },
  );

  private save(): void {
    const draft = this.draft();
    // Aquí sabemos que los números no son null porque la validación "required" ha pasado.
    this.store.add({
      date: draft.date,
      exercise: draft.exercise.trim(),
      sets: draft.sets!,
      reps: draft.reps!,
      weightKg: draft.weightKg!,
    });
    // Vaciamos el formulario pero mantenemos la fecha, para registrar el siguiente ejercicio del día.
    this.workoutForm().reset(emptyDraft(draft.date));
  }
}

function emptyDraft(date: string): WorkoutDraft {
  return { date, exercise: '', sets: null, reps: null, weightKg: null };
}

/** Fecha de hoy en formato AAAA-MM-DD, según la hora local. */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
