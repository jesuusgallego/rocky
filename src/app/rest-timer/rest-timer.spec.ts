import { TestBed } from '@angular/core/testing';
import { RestTimer } from './rest-timer';

describe('RestTimer', () => {
  let timer: RestTimer;
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Relojes falsos: el test avanza el tiempo a mano en lugar de esperar de verdad.
    vi.useFakeTimers();
    vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    timer = TestBed.inject(RestTimer);
  });

  afterEach(() => {
    timer.stop();
    vi.useRealTimers();
  });

  it('counts down and vibrates when the rest is over', () => {
    timer.start(90, 'Dominadas');
    expect(timer.running()).toBe(true);
    expect(timer.remainingSeconds()).toBe(90);

    vi.advanceTimersByTime(30_000);
    expect(timer.remainingSeconds()).toBe(60);

    vi.advanceTimersByTime(60_000);
    expect(timer.running()).toBe(false);
    expect(vibrate).toHaveBeenCalledOnce();
  });

  it('adds 15 seconds', () => {
    timer.start(60, 'Fondos');
    timer.addSeconds(15);
    expect(timer.remainingSeconds()).toBe(75);
  });

  it('stops without vibrating when skipped', () => {
    timer.start(60, 'Fondos');
    timer.stop();
    vi.advanceTimersByTime(60_000);
    expect(timer.running()).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });
});
