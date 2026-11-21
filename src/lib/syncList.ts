// Saves an edited list (e.g. responsibilities) by diffing it against what was loaded:
// removed rows are deleted, changed rows updated, new rows inserted. Order is stored in `position`.
import { deleteRow, insertRow, updateRow, type ContentTable } from './api';

export type DraftRow<T> = Partial<T> & { id: string };

let counter = 0;
/** Temporary id for a row that has not been saved yet. */
export const newDraftId = () => `new-${++counter}`;
const isNew = (id: string) => id.startsWith('new-');

export async function syncList<T extends { id: string; position: number }>(
  table: ContentTable,
  roleId: string,
  original: T[],
  draft: DraftRow<T>[],
  fields: (keyof T)[],
): Promise<void> {
  const kept = draft.filter(row => fields.some(f => String(row[f] ?? '').trim() !== ''));
  const keptIds = new Set(kept.map(r => r.id));
  const byId = new Map(original.map(r => [r.id, r]));

  const deletes = original.filter(r => !keptIds.has(r.id)).map(r => deleteRow(table, r.id));

  const writes = kept.map((row, position) => {
    const values = Object.fromEntries(fields.map(f => [f, typeof row[f] === 'string' ? (row[f] as string).trim() : row[f]])) as Partial<T>;
    if (isNew(row.id)) return insertRow<T>(table, { ...values, position, role_id: roleId } as Partial<T>);
    const before = byId.get(row.id)!;
    const changed = before.position !== position || fields.some(f => before[f] !== values[f]);
    return changed ? updateRow<T>(table, row.id, { ...values, position } as Partial<T>) : null;
  });

  await Promise.all([...deletes, ...writes]);
}
