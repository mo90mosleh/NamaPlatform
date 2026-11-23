import type {Data} from './types';

const modeKey = 'nama-demo-admin';
const editsKey = 'nama-demo-edits-v1';

export function demoAdminActive() {
  try { return sessionStorage.getItem(modeKey) === '1'; }
  catch { return false; }
}

export function setDemoAdmin(active: boolean) {
  if (active) sessionStorage.setItem(modeKey, '1');
  else sessionStorage.removeItem(modeKey);
}

type EditableData = Pick<Data, 'organization' | 'units' | 'positions' | 'persons' |
  'assignments' | 'profiles' | 'trainingVideos'>;

function readEdits(): Partial<EditableData> {
  try { return JSON.parse(localStorage.getItem(editsKey) ?? '{}') ?? {}; }
  catch { return {}; }
}

export function applyDemoEdits(data: Data): Data {
  return {...data, ...readEdits(), user: demoAdminActive()
    ? {name: 'مدیر دمو', email: '', role: 'ADMIN'}
    : data.user};
}

const tables = {
  'org-units': {key: 'units', fields: ['name', 'code', 'parent_id']},
  positions: {key: 'positions', fields: ['title', 'org_unit_id', 'reports_to_position_id']},
  persons: {key: 'persons', fields: ['display_name', 'email', 'phone', 'extension', 'avatar_data_url']},
  assignments: {key: 'assignments', fields: ['person_id', 'position_id']},
  'training-videos': {key: 'trainingVideos', fields: ['process_id', 'title', 'external_url']},
} as const;

function fields(value: unknown, names: readonly string[]) {
  const input = value as Record<string, unknown> | undefined;
  return Object.fromEntries(names.flatMap(name => {
    const field = input?.[name];
    return typeof field === 'string' ? [[name, field.trim() || null]] : field === null ? [[name, null]] : [];
  }));
}

type RecordRow = {id: string; [name: string]: unknown};
function ensureParent(rows: RecordRow[], field: string, parent: unknown, id?: string) {
  const seen = new Set<unknown>([id]);
  while (parent) {
    if (seen.has(parent)) throw Error('انتخاب این بالادست باعث ایجاد چرخه می‌شود.');
    seen.add(parent);
    parent = rows.find(row => row.id === parent)?.[field];
  }
}

export function updateDemoData(data: Data, path: string, method: string, value?: unknown) {
  if (!demoAdminActive()) throw Error('ابتدا فضای مدیریت دمو را باز کنید.');
  const [kind, id] = path.split('/');
  const {organization, units, positions, persons, assignments, profiles, trainingVideos} = data;
  const currentData: EditableData = {organization, units, positions, persons, assignments, profiles, trainingVideos};
  const edits = readEdits();
  if (kind === 'organization' && method === 'PATCH') {
    edits.organization = {...organization, ...fields(value, ['name', 'display_name', 'primary_color', 'logo_data_url'])};
  } else if (kind === 'profiles' && method === 'PUT' && data.nodes.some(node => node.id === id && node.kind === 'PROCESS')) {
    const profile = {
      ...profiles.find(row => row.process_id === id), process_id: id,
      ...fields(value, ['objective', 'start_event', 'end_event', 'inputs', 'outputs', 'roles', 'expected_outcome', 'notes']),
    } as Data['profiles'][number];
    edits.profiles = [...profiles.filter(row => row.process_id !== id), profile];
  } else {
    const table = tables[kind as keyof typeof tables];
    if (!table) throw Error('عملیات پشتیبانی نمی‌شود.');
    const rows = (currentData[table.key] ?? []) as RecordRow[];
    const current = rows.find(row => row.id === id);
    const clean = fields(value, table.fields);
    let next: RecordRow[];
    if (method === 'DELETE' && current) {
      const hasDependency = kind === 'org-units' && (units.some(u => u.parent_id === id) || positions.some(p => p.org_unit_id === id) || data.nodes.some(n => n.owner_org_unit_id === id) || data.kpiOrgLinks?.some(l => l.org_unit_id === id))
        || kind === 'positions' && (positions.some(p => p.reports_to_position_id === id) || assignments.some(a => a.position_id === id) || data.kpiOrgLinks?.some(l => l.position_id === id))
        || kind === 'persons' && (assignments.some(a => a.person_id === id) || data.kpis.some(k => 'owner_person_id' in k && k.owner_person_id === id));
      if (hasDependency) throw Error('این رکورد وابستگی دارد و قابل حذف نیست.');
      next = rows.filter(row => row.id !== id);
    } else if ((method === 'POST' && !id) || (method === 'PATCH' && current)) {
      if (kind === 'org-units') ensureParent(rows, 'parent_id', clean.parent_id, id);
      if (kind === 'positions') ensureParent(rows, 'reports_to_position_id', clean.reports_to_position_id, id);
      if (kind === 'assignments' && assignments.some(a => a.id !== id && a.person_id === clean.person_id && a.position_id === clean.position_id)) {
        throw Error('این شخص قبلاً به این سمت تخصیص داده شده است.');
      }
      next = current ? rows.map(row => row.id === id ? {...row, ...clean} : row)
        : [...rows, {...(kind === 'org-units' ? {sort_order: Math.max(0, ...units.map(u => u.sort_order)) + 1} : {}), ...clean, id: crypto.randomUUID()}];
    } else throw Error('رکورد پیدا نشد یا عملیات معتبر نیست.');
    Object.assign(edits, {[table.key]: next});
  }
  try { localStorage.setItem(editsKey, JSON.stringify(edits)); }
  catch { throw Error('ذخیرهٔ تغییرات در مرورگر ممکن نیست. فضای ذخیره‌سازی یا تنظیمات مرورگر را بررسی کنید.'); }
  return {ok: true};
}
