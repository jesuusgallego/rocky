/** Catálogo de ejercicios y rutinas. Son datos fijos: no se guardan, viven en el código. */

export type ExerciseId =
  | 'hang'
  | 'pull'
  | 'aus'
  | 'dips'
  | 'bulg'
  | 'knee'
  | 'neg'
  | 'hangs'
  | 'chin'
  | 'auss'
  | 'push'
  | 'lunge'
  | 'plank';

export type RoutineId = 'A' | 'B';

/** Cómo se mide un ejercicio: repeticiones o segundos aguantando. */
export type Unit = 'reps' | 'seconds';

/** Un nivel de la escalera de un ejercicio: el objetivo que hay que cumplir. */
export interface Level {
  readonly sets: number;
  /** Rango de repeticiones (o segundos) por serie. Subes cuando llegas a `max` en todas. */
  readonly min: number;
  readonly max: number;
  readonly variant: string;
  /** Las repeticiones se cuentan por cada lado (pierna o brazo). */
  readonly perSide: boolean;
  /** Peso extra en kg (mochila o lastre). */
  readonly extraKg: number;
}

interface ExerciseInfo {
  readonly name: string;
  readonly unit: Unit;
  readonly restSeconds: number;
  /** Sesiones seguidas al tope necesarias para subir de nivel. 0 = no sube. */
  readonly sessionsToLevelUp: number;
  readonly howTo: string;
  readonly note?: string;
  /** Mensaje al llegar al último nivel de la escalera. */
  readonly lastLevelNote?: string;
}

/**
 * Un ejercicio tiene una escalera de niveles fija ("ladder") o una que no acaba nunca
 * ("endless"), donde cada nivel se calcula a partir de su número (por ejemplo, más lastre).
 * El campo `kind` le dice a TypeScript cuál de las dos es.
 */
export type Exercise = ExerciseInfo &
  (
    | { readonly kind: 'ladder'; readonly ladder: readonly Level[] }
    | { readonly kind: 'endless'; readonly generate: (index: number) => Level }
  );

export interface Routine {
  readonly name: string;
  readonly focus: string;
  readonly exerciseIds: readonly ExerciseId[];
}

function level(
  sets: number,
  min: number,
  max: number,
  variant: string,
  options: { perSide?: boolean; extraKg?: number } = {},
): Level {
  return {
    sets,
    min,
    max,
    variant,
    perSide: options.perSide ?? false,
    extraKg: options.extraKg ?? 0,
  };
}

/** 2.5 → "2,5" */
export function formatKg(kg: number): string {
  return String(Math.round(kg * 10) / 10).replace('.', ',');
}

const HANG_LADDER = [
  level(3, 20, 30, 'Dos manos'),
  level(3, 30, 45, 'Dos manos'),
  level(3, 10, 15, 'Una mano, alternando', { perSide: true }),
];

const ROW_LADDER = [
  level(3, 10, 15, 'Rodillas flexionadas'),
  level(3, 8, 12, 'Piernas estiradas'),
  level(3, 8, 12, 'Pies elevados'),
  level(3, 8, 12, 'Pausa de 2 s arriba'),
];

/** Pierna: dos niveles sin peso y después mochila, 2,5 kg más cada nivel. */
function legLevel(index: number): Level {
  if (index === 0) return level(3, 10, 12, 'Peso corporal', { perSide: true });
  if (index === 1) return level(3, 12, 15, 'Peso corporal', { perSide: true });
  const kg = 5 + 2.5 * (index - 2);
  return level(3, 10, 12, `Mochila ${formatKg(kg)} kg`, { perSide: true, extraKg: kg });
}

/** Barra: sube una repetición por nivel hasta base + 2; luego lastre, repitiendo el ciclo de repeticiones. */
function barLevels(sets: number, baseReps: number): (index: number) => Level {
  return (index) => {
    if (index < 3) return level(sets, baseReps + index, baseReps + index, 'Peso corporal');
    const k = index - 3;
    const reps = baseReps + (k % 3);
    const kg = 2.5 * (1 + Math.floor(k / 3));
    return level(sets, reps, reps, `Lastre +${formatKg(kg)} kg`, { extraKg: kg });
  };
}

function dipLevel(index: number): Level {
  if (index === 0) return level(3, 6, 10, 'Paralelas');
  if (index === 1) return level(3, 10, 12, 'Paralelas');
  if (index === 2) return level(3, 8, 10, 'Bajada lenta de 3 s');
  const kg = 2.5 * (index - 2);
  return level(3, 6, 10, `Mochila +${formatKg(kg)} kg`, { extraKg: kg });
}

export const EXERCISES: Readonly<Record<ExerciseId, Exercise>> = {
  hang: {
    name: 'Dead hang',
    unit: 'seconds',
    restSeconds: 60,
    sessionsToLevelUp: 2,
    kind: 'ladder',
    ladder: HANG_LADDER,
    howTo:
      'Palmas hacia delante, manos a la anchura de los hombros. Brazos estirados pero hombros activos: omóplatos hacia abajo, lejos de las orejas.',
    lastLevelNote: 'Con 45 s cómodos ya puedes quitarlo y meter una serie más de dominadas.',
  },
  pull: {
    name: 'Dominadas',
    unit: 'reps',
    restSeconds: 120,
    sessionsToLevelUp: 3,
    kind: 'endless',
    generate: barLevels(5, 3),
    howTo:
      'Palmas hacia delante. Junta los omóplatos antes de doblar los codos, barbilla por encima de la barra y baja hasta brazos estirados. Nada de impulso con las piernas. Párate 1-2 repeticiones antes del fallo.',
    note: 'Tras 3 sesiones completas a 5 × 5 toca test de máximo: con 8 o más, pasas a lastre. Lastre = mochila con botellas de agua (1 litro, 1 kg).',
  },
  aus: {
    name: 'Remo invertido',
    unit: 'reps',
    restSeconds: 75,
    sessionsToLevelUp: 2,
    kind: 'ladder',
    ladder: ROW_LADDER,
    howTo:
      'Cuerpo rígido como una tabla: aprieta glúteo y abdomen. Tira del pecho hacia la barra juntando omóplatos y baja controlado. Si tocas el suelo, dobla las rodillas a 90° o usa la barra alta caminando los pies hacia delante.',
  },
  dips: {
    name: 'Fondos',
    unit: 'reps',
    restSeconds: 90,
    sessionsToLevelUp: 2,
    kind: 'endless',
    generate: dipLevel,
    howTo:
      'Codos hacia atrás y pegados al cuerpo, baja hasta 90° y sube. Hombros lejos de las orejas. Si tu parque no tiene paralelas: flexiones con pies elevados, mismo rango de repeticiones.',
  },
  bulg: {
    name: 'Sentadilla búlgara',
    unit: 'reps',
    restSeconds: 75,
    sessionsToLevelUp: 2,
    kind: 'endless',
    generate: legLevel,
    howTo:
      'Empeine de atrás sobre un banco a la altura de la rodilla, pies como sobre vías de tren. Baja vertical hasta que la rodilla casi toque el suelo y sube empujando con el talón de delante. La pierna de atrás no empuja.',
  },
  knee: {
    name: 'Elevaciones colgado',
    unit: 'reps',
    restSeconds: 60,
    sessionsToLevelUp: 2,
    kind: 'ladder',
    ladder: [
      level(3, 8, 12, 'Rodillas al pecho'),
      level(3, 6, 10, 'Piernas estiradas a 90°'),
      level(3, 5, 8, 'Pies a la barra'),
    ],
    howTo:
      'Colgado de la barra, sube sin balancearte y aguanta medio segundo arriba. Si te columpias, más lento y menos repeticiones.',
  },
  neg: {
    name: 'Negativas',
    unit: 'reps',
    restSeconds: 90,
    sessionsToLevelUp: 0,
    kind: 'ladder',
    ladder: [level(2, 3, 3, 'Bajada de 5 s')],
    howTo:
      'Sin banco: sube con una dominada o de un salto hasta tener la barbilla arriba y baja contando 5 segundos. Suelta abajo con las rodillas un poco flexionadas.',
    note: 'Remate final. Desaparece cuando llegues a 5 × 5 en dominadas.',
  },
  hangs: {
    name: 'Dead hang supino',
    unit: 'seconds',
    restSeconds: 60,
    sessionsToLevelUp: 2,
    kind: 'ladder',
    ladder: HANG_LADDER,
    howTo: 'Igual que el dead hang pero con las palmas hacia ti. Carga más bíceps y antebrazo.',
    lastLevelNote: 'Con 45 s cómodos ya puedes quitarlo y meter una serie más de chin-ups.',
  },
  chin: {
    name: 'Chin-ups',
    unit: 'reps',
    restSeconds: 120,
    sessionsToLevelUp: 3,
    kind: 'endless',
    generate: barLevels(4, 4),
    howTo:
      'Palmas hacia ti, manos a la anchura de los hombros. Barbilla por encima de la barra y baja completo. Párate 1-2 repeticiones antes del fallo.',
    note: 'Lastre = mochila con botellas de agua (1 litro, 1 kg).',
  },
  auss: {
    name: 'Remo invertido supino',
    unit: 'reps',
    restSeconds: 75,
    sessionsToLevelUp: 2,
    kind: 'ladder',
    ladder: ROW_LADDER,
    howTo:
      'El mismo remo pero con las palmas hacia ti, cambia el ángulo respecto a la sesión A. Si tocas el suelo, rodillas dobladas a 90°.',
  },
  push: {
    name: 'Flexiones',
    unit: 'reps',
    restSeconds: 75,
    sessionsToLevelUp: 2,
    kind: 'ladder',
    ladder: [
      level(3, 8, 12, 'Pies elevados en un banco'),
      level(3, 8, 12, 'Diamante'),
      level(3, 5, 8, 'Archer', { perSide: true }),
    ],
    howTo:
      'Manos algo más anchas que los hombros, codos a unos 45° del cuerpo. Cuerpo recto de talón a cabeza y pecho casi al suelo.',
  },
  lunge: {
    name: 'Zancadas',
    unit: 'reps',
    restSeconds: 75,
    sessionsToLevelUp: 2,
    kind: 'endless',
    generate: legLevel,
    howTo:
      'Paso largo, rodilla de atrás casi al suelo y torso erguido. Las repeticiones son por pierna.',
  },
  plank: {
    name: 'Plancha',
    unit: 'seconds',
    restSeconds: 60,
    sessionsToLevelUp: 2,
    kind: 'ladder',
    ladder: [
      level(3, 30, 45, 'Frontal'),
      level(3, 45, 60, 'Frontal'),
      level(3, 30, 45, 'Un brazo o una pierna arriba'),
      level(3, 30, 45, 'Brazo y pierna contrarios'),
    ],
    howTo:
      'Antebrazos en el suelo, codos bajo los hombros, glúteo y abdomen apretados. Si se arquea la espalda baja, la serie se acaba.',
    lastLevelNote: 'Más de 60 s no da más fuerza. Mantén este nivel.',
  },
};

export const ROUTINES: Readonly<Record<RoutineId, Routine>> = {
  A: {
    name: 'Sesión A',
    focus: 'Tracción',
    exerciseIds: ['hang', 'pull', 'aus', 'dips', 'bulg', 'knee', 'neg'],
  },
  B: {
    name: 'Sesión B',
    focus: 'Empuje',
    exerciseIds: ['hangs', 'chin', 'auss', 'push', 'lunge', 'plank'],
  },
};

export const ROUTINE_IDS: readonly RoutineId[] = ['A', 'B'];

export function levelAt(id: ExerciseId, index: number): Level {
  const exercise = EXERCISES[id];
  return exercise.kind === 'ladder'
    ? exercise.ladder[Math.min(index, exercise.ladder.length - 1)]
    : exercise.generate(index);
}

/** Índice del último nivel; infinito si la escalera no acaba. */
export function lastLevelIndex(id: ExerciseId): number {
  const exercise = EXERCISES[id];
  return exercise.kind === 'ladder' ? exercise.ladder.length - 1 : Infinity;
}

function unitSuffix(unit: Unit): string {
  return unit === 'seconds' ? ' s' : '';
}

/** "3 × 8-12" o "5 × 5" (con " s" si son segundos). */
export function formatTarget(target: Pick<Level, 'sets' | 'min' | 'max'>, unit: Unit): string {
  const range = target.min === target.max ? `${target.max}` : `${target.min}-${target.max}`;
  return `${target.sets} × ${range}${unitSuffix(unit)}`;
}

/** Descripción corta: "3 × 8-12 · diamante". */
export function describeLevel(id: ExerciseId, index: number): string {
  const step = levelAt(id, index);
  const variant =
    step.variant && step.variant !== 'Peso corporal' ? ` · ${step.variant.toLowerCase()}` : '';
  return formatTarget(step, EXERCISES[id].unit) + variant + (step.perSide ? ' por lado' : '');
}

/** Descripción completa: "3 × 8-12 por lado · Peso corporal". */
export function describeLevelFull(id: ExerciseId, index: number): string {
  const step = levelAt(id, index);
  return (
    formatTarget(step, EXERCISES[id].unit) +
    (step.perSide ? ' por lado' : '') +
    ` · ${step.variant}`
  );
}

/** 90 → "1:30 min", 120 → "2 min". */
export function formatRest(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} min`;
}
