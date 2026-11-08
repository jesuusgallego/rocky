import { computed, Service, signal } from '@angular/core';

/**
 * Cuenta atrás del descanso entre series.
 *
 * Guarda la HORA a la que termina, no los segundos que quedan: si el móvil bloquea la pantalla
 * y el navegador frena los temporizadores, al volver el tiempo restante sigue siendo correcto.
 */
@Service()
export class RestTimer {
  private readonly endsAt = signal(0);
  private readonly totalSeconds = signal(0);
  private readonly now = signal(Date.now());
  private interval: ReturnType<typeof setInterval> | undefined;
  private audio: AudioContext | undefined;

  /** Ejercicio del que se descansa. */
  readonly label = signal('');
  readonly running = computed(() => this.endsAt() > 0);
  readonly remainingSeconds = computed(() =>
    Math.max(0, Math.ceil((this.endsAt() - this.now()) / 1000)),
  );
  /** Parte del descanso que queda, de 1 (recién empezado) a 0 (terminado). */
  readonly fractionLeft = computed(() => {
    const total = this.totalSeconds() * 1000;
    return total ? Math.min(1, Math.max(0, (this.endsAt() - this.now()) / total)) : 0;
  });

  start(seconds: number, label: string): void {
    this.prepareSound();
    this.totalSeconds.set(seconds);
    this.endsAt.set(Date.now() + seconds * 1000);
    this.now.set(Date.now());
    this.label.set(label);
    clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), 250);
  }

  addSeconds(seconds: number): void {
    if (!this.running()) return;
    this.endsAt.update((end) => end + seconds * 1000);
    this.totalSeconds.update((total) => total + seconds);
  }

  stop(): void {
    clearInterval(this.interval);
    this.interval = undefined;
    this.endsAt.set(0);
  }

  private tick(): void {
    this.now.set(Date.now());
    if (this.now() >= this.endsAt()) {
      this.stop();
      this.notify();
    }
  }

  /** Vibra (Android) y suena dos pitidos. */
  private notify(): void {
    try {
      navigator.vibrate?.([150, 90, 150]);
    } catch {
      // Sin vibración en este dispositivo.
    }
    const audio = this.audio;
    if (!audio) return;
    for (const offset of [0, 0.25]) {
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      oscillator.frequency.value = 880;
      volume.gain.value = 0.2;
      oscillator.connect(volume).connect(audio.destination);
      oscillator.start(audio.currentTime + offset);
      oscillator.stop(audio.currentTime + offset + 0.15);
    }
  }

  /**
   * Los navegadores solo dejan sonar audio si se activó durante un toque del usuario.
   * start() se llama justo al guardar una serie, así que aquí aprovechamos ese toque.
   */
  private prepareSound(): void {
    try {
      this.audio ??= new AudioContext();
      void this.audio.resume();
    } catch {
      // Sin audio disponible: el temporizador funciona igual, solo que en silencio.
    }
  }
}
