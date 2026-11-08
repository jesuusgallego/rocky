import { Component, computed, inject } from '@angular/core';
import { RestTimer } from './rest-timer';

const RING_LENGTH = 125.7; // perímetro del círculo (2 · π · 20)

/** Barra fija abajo con la cuenta atrás del descanso. Se ve en cualquier pantalla. */
@Component({
  selector: 'app-rest-timer-bar',
  templateUrl: './rest-timer-bar.html',
  styleUrl: './rest-timer-bar.css',
})
export class RestTimerBar {
  protected readonly timer = inject(RestTimer);

  /** 95 → "1:35" */
  protected readonly time = computed(() => {
    const seconds = this.timer.remainingSeconds();
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  protected readonly ringOffset = computed(() =>
    (RING_LENGTH * (1 - this.timer.fractionLeft())).toFixed(1),
  );
}
