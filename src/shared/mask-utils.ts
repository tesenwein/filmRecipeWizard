// Utility helpers for consistent mask ID generation and applying overrides

export type MaskLike = {
  id?: string;
  name?: string;
  type?: string;
  subCategoryId?: number;
  referenceX?: number;
  referenceY?: number;
  adjustments?: Record<string, any>;
  op?: 'add' | 'update' | 'remove' | 'remove_all' | 'clear';
  [key: string]: any;
};

// Create a stable identifier for a mask across renderer/main
export function maskIdentifier(m: MaskLike | undefined | null): string {
  if (!m) return 'mask:undefined';
  if (m.id && typeof m.id === 'string') return m.id;
  if (m.name && typeof m.name === 'string') return `name:${m.name}`;
  const type = (m.type ?? 'mask').toString();
  const sub = m.subCategoryId ?? '';
  const rx = (m.referenceX ?? '').toString().slice(0, 4);
  const ry = (m.referenceY ?? '').toString().slice(0, 4);
  return `${type}:${sub}:${rx}:${ry}`;
}

export function findMaskIndex(list: MaskLike[], m: MaskLike): number {
  const id = maskIdentifier(m);
  return list.findIndex(x => maskIdentifier(x) === id);
}

// More forgiving match used when ops are underspecified (e.g., missing subCategoryId/reference coords)
export function findMaskIndexFlexible(list: MaskLike[], m: MaskLike): number {
  // First try strict identifier match
  const strict = findMaskIndex(list, m);
  if (strict >= 0) return strict;

  // Fallback by name
  if (m.name) {
    const byName = list.findIndex(x => (x?.name || '').toString() === m.name);
    if (byName >= 0) return byName;
  }

  // Fallback by type and optional subCategoryId (ignore reference coords)
  if (m.type) {
    const byType = list.findIndex(x => {
      if ((x?.type || '') !== m.type) return false;
      if (typeof m.subCategoryId === 'number') {
        return Number((x as any).subCategoryId) === Number(m.subCategoryId);
      }
      return true;
    });
    if (byType >= 0) return byType;
  }

  return -1;
}

// Apply a list of override operations to a base mask list
export function applyMaskOverrides(
  baseMasksInput: MaskLike[] | undefined,
  opsInput: MaskLike[] | undefined
): MaskLike[] {
  let baseMasks: MaskLike[] = baseMasksInput ? [...baseMasksInput] : [];
  const ops: MaskLike[] = opsInput || [];

  for (const op of ops) {
    const operation = (op.op as string) || 'add';

    if (operation === 'remove_all' || operation === 'clear') {
      baseMasks = [];
      continue;
    }

    const idx = findMaskIndexFlexible(baseMasks, op);

    if (operation === 'remove') {
      if (idx >= 0) baseMasks.splice(idx, 1);
      continue;
    }

    if (operation === 'update') {
      if (idx >= 0) {
        const prev = baseMasks[idx] || {};
        baseMasks[idx] = {
          ...prev,
          ...op,
          id: prev.id || op.id || maskIdentifier(op),
          adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) },
        };
      } else {
        baseMasks.push({ ...op, id: op.id || maskIdentifier(op) });
      }
      continue;
    }

    // default add
    if (idx >= 0) {
      const prev = baseMasks[idx] || {};
      baseMasks[idx] = {
        ...prev,
        ...op,
        id: prev.id || op.id || maskIdentifier(op),
        adjustments: { ...(prev.adjustments || {}), ...(op.adjustments || {}) },
      };
    } else {
      baseMasks.push({ ...op, id: op.id || maskIdentifier(op) });
    }
  }

  return baseMasks;
}
