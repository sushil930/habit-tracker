import Ajv from 'ajv';
import type { Habit } from '../types';

export type BackupV1 = Habit[];

export interface BackupV2 {
  schemaVersion: 2;
  exportedAt: string; // ISO
  app: 'HabitFlow';
  habits: Habit[];
}

const habitSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    color: { type: 'string' },
    icon: { type: 'string', nullable: true },
    category: { type: 'string' },
    frequency: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
        goal: { type: 'integer' },
      },
      required: ['type', 'goal'],
      additionalProperties: false,
    },
    createdAt: { type: 'string' },
    logs: {
      type: 'object',
      required: [],
      additionalProperties: { type: 'boolean' },
    },
    archived: { type: 'boolean' },
  },
  required: ['id', 'name', 'color', 'category', 'frequency', 'createdAt', 'logs', 'archived'],
  additionalProperties: true,
} as const;

const backupV2Schema = {
  type: 'object',
  properties: {
    schemaVersion: { type: 'integer', const: 2 },
    exportedAt: { type: 'string' },
    app: { type: 'string', const: 'HabitFlow' },
    // Validate the wrapper strongly, but validate/migrate habits separately to keep backward compatibility.
    habits: { type: 'array' },
  },
  required: ['schemaVersion', 'exportedAt', 'app', 'habits'],
  additionalProperties: true,
} as const;

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validateBackupV2 = ajv.compile(backupV2Schema as any);
const validateHabit = ajv.compile(habitSchema as any);

function normalizeHabitForImport(input: any): Habit {
  const normalized: any = { ...input };

  if (!normalized.category) normalized.category = 'General';
  if (!normalized.frequency) normalized.frequency = { type: 'daily', goal: 1 };
  if (!normalized.logs || typeof normalized.logs !== 'object') normalized.logs = {};
  if (typeof normalized.archived !== 'boolean') normalized.archived = false;
  if (!normalized.createdAt) normalized.createdAt = new Date().toISOString();

  return normalized as Habit;
}

function validateHabitsOrThrow(habits: Habit[]): void {
  const invalidIndexes: number[] = [];
  for (let i = 0; i < habits.length; i++) {
    if (!validateHabit(habits[i])) {
      invalidIndexes.push(i);
    }
  }

  if (invalidIndexes.length > 0) {
    const message = ajv.errorsText(validateHabit.errors, { separator: '\n' });
    const where = invalidIndexes.length === 1 ? `item ${invalidIndexes[0]}` : `items ${invalidIndexes.join(', ')}`;
    throw new Error(`Backup schema validation failed (${where}):\n${message || 'Invalid habit structure.'}`);
  }
}

export function createBackupPayload(habits: Habit[]): BackupV2 {
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    app: 'HabitFlow',
    habits,
  };
}

export function parseBackupJson(jsonText: string): Habit[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }

  // v2 format
  if (typeof parsed === 'object' && parsed !== null && (parsed as any).schemaVersion === 2) {
    if (!validateBackupV2(parsed)) {
      const message = ajv.errorsText(validateBackupV2.errors, { separator: '\n' });
      throw new Error(`Backup schema validation failed:\n${message}`);
    }

    const rawHabits = (parsed as any).habits;
    if (!Array.isArray(rawHabits)) {
      throw new Error('Backup schema validation failed:\n/habits must be an array');
    }

    const normalized = rawHabits.map(normalizeHabitForImport);
    validateHabitsOrThrow(normalized);
    return normalized;
  }

  // v1 format (array of habits)
  if (Array.isArray(parsed)) {
    const normalized = parsed.map(normalizeHabitForImport);
    validateHabitsOrThrow(normalized);
    return normalized;
  }

  throw new Error('Unrecognized backup format.');
}
