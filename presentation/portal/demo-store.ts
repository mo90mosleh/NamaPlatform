import type {Data} from './types';
import {categories, emptyGovernance, raciRoles, sampleGovernance, type Governance} from './process-governance';

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
  'assignments' | 'profiles' | 'trainingVideos' | 'governance'>;

function readEdits(): Partial<EditableData> {
  try { return JSON.parse(localStorage.getItem(editsKey) ?? '{}') ?? {}; }
  catch { return {}; }
}

export function applyDemoEdits(data: Data): Data {
  const edits = readEdits();
  return {...data, ...edits, governance: {...sampleGovernance(data), ...edits.governance}, user: demoAdminActive()
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
  } else if (kind === 'process-governance' && method === 'PUT' && id && data.nodes.some(node => node.id === id && node.kind === 'PROCESS')) {
    const change = value as Partial<Governance>;
    const next = {...(data.governance?.[id] ?? emptyGovernance), ...change};
    const validPosition = (position: string) => positions.some(row => row.id === position);
    if (next.apqc && !categories.some(([code]) => code === next.apqc)) throw Error('دسته APQC معتبر نیست.');
    if (next.raci.some(row => {
      const roles = Object.values(row.roles);
      return !row.activity.trim() || !roles.includes('R') || roles.filter(role => role === 'A').length !== 1
        || Object.entries(row.roles).some(([position, role]) => !validPosition(position) || !Object.hasOwn(raciRoles, role));
    })) throw Error('هر فعالیت باید دست‌کم یک مسئول اجرا و دقیقاً یک سمت پاسخ‌گو داشته باشد.');
    if (next.doa.some(row => !row.decision.trim() || !row.condition.trim() || !validPosition(row.position)
      || (row.escalation && (!validPosition(row.escalation) || row.escalation === row.position)))) {
      throw Error('تصمیم، شرط و سمت دارای اختیار را تکمیل کنید. سمت ارجاع باید متفاوت باشد.');
    }
    edits.governance = {...edits.governance, [id]: next};
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
        || kind === 'positions' && (positions.some(p => p.reports_to_position_id === id)
          || Object.values(data.governance ?? {}).some(record => record.raci.some(row => Object.hasOwn(row.roles, id))
            || record.doa.some(row => row.position === id || row.escalation === id)) || assignments.some(a => a.position_id === id) || data.kpiOrgLinks?.some(l => l.position_id === id))
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
