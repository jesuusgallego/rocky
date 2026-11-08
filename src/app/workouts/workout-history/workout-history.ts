import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { WorkoutEntry } from '../workout-entry';
import { WorkoutStore } from '../workout-store';

interface WorkoutDay {
  date: string;
  entries: WorkoutEntry[];
}

@Component({
  imports: [DatePipe],
  selector: 'app-workout-history',
  styleUrl: './workout-history.css',
  templateUrl: './workout-history.html',
})
export class WorkoutHistory {
  private readonly store = inject(WorkoutStore);

  /** Registros agrupados por día, del más reciente al más antiguo. Se recalcula solo al cambiar la lista. */
  protected readonly days = computed<WorkoutDay[]>(() => {
    const byDate = new Map<string, WorkoutEntry[]>();
    for (const entry of this.store.entries()) {
      const dayEntries = byDate.get(entry.date) ?? [];
      dayEntries.push(entry);
      byDate.set(entry.date, dayEntries);
    }
    return [...byDate]
      .map(([date, entries]) => ({ date, entries }))
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  protected remove(entry: WorkoutEntry): void {
    if (confirm(`¿Borrar "${entry.exercise}"?`)) {
      this.store.remove(entry.id);
    }
  }
}
