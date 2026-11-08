import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { Unit } from '../../training/exercise-catalog';

/**
 * Panel que sube desde abajo para anotar un número con botones − y +
 * (cómodo con el móvil en la mano y sin teclado).
 *
 * Recibe datos con input() y avisa de lo que pasa con output():
 * el componente que lo usa decide qué hacer con el valor.
 */
@Component({
  selector: 'app-number-sheet',
  templateUrl: './number-sheet.html',
  styleUrl: './number-sheet.css',
  host: { '(document:keydown.escape)': 'cancelled.emit()' },
})
export class NumberSheet {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly unit = input.required<Unit>();
  readonly initialValue = input.required<number>();
  readonly canRemove = input(false);
  readonly saveLabel = input('Guardar serie');

  readonly saved = output<number>();
  readonly removed = output<void>();
  readonly cancelled = output<void>();

  // Empieza con el valor recibido y luego cambia con los botones.
  protected readonly value = linkedSignal(() => this.initialValue());
  protected readonly unitLabel = computed(() => (this.unit() === 'seconds' ? 's' : 'reps'));
  private readonly step = computed(() => (this.unit() === 'seconds' ? 5 : 1));

  protected change(direction: 1 | -1): void {
    this.value.update((v) => Math.max(0, v + direction * this.step()));
  }
}
