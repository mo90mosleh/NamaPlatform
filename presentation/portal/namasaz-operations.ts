import {editsKey, readEdits, type EditableData} from './demo-store';
import {initialModel, readMonitoring, storageKey} from './KpiMonitoring';
import {loadPortfolio} from './okr/portfolio-storage';
import {strategicPillars, withKeyResult, withObjective} from './okr/model';
import type {Data, Profile} from './types';

type Option = {value: string; label: string};
type Field = {name: string; label: string; optional?: boolean; options?: Option[]; type?: 'number' | 'textarea'};
type Values = Record<string, string>;
type Change = {key: string; next: unknown; href: string};
type Operation = {
  title: string;
  fields: Field[];
  prepare: (v: Values) => Change;
  defaults?: (id: string) => Values;
};

const option = (value: string, label: string): Option => ({value, label});
const input = (name: string, label: string, optional = false, type?: Field['type']): Field => ({name, label, optional, type});
const select = (name: string, label: string, options: Option[], optional = false): Field => ({name, label, options, optional});
const id = () => crypto.randomUUID();
const nullable = (value: string) => value || null;

function unique(rows: {code: string | null; id: string}[], code: string, except?: string) {
  if (rows.some(row => row.id !== except && row.code?.toLowerCase() === code.toLowerCase())) {
    throw Error('این کد قبلاً ثبت شده است.');
  }
}

export function namasazKeys(data: Data) {
  return [editsKey, storageKey(data), 'nama-okr-workspace-v1:' + data.organization.id];
}

export function namasazOperations(data: Data): {title: string; operations: Operation[]}[] {
  const processes = data.nodes.filter(node => node.kind === 'PROCESS');
  const processOptions = processes.map(row => option(row.id, row.name));
  const groups = data.nodes.filter(node => node.kind === 'GROUP').map(row => option(row.id, row.name));
  const units = data.units.map(row => option(row.id, row.name));
  const positions = data.positions.map(row => option(row.id, row.title));
  const indicators = data.kpis.map(row => option(row.id, row.name));
  const portfolio = loadPortfolio(data.organization.id, data.organization.name, true);
  const [demoKey, monitoringKey, okrKey] = namasazKeys(data);
  const save = (updates: Partial<EditableData>, href: string): Change => ({
    key: demoKey, next: {...readEdits(), ...updates}, href,
  });

  const processFields = [
    input('name', 'نام فرآیند'), input('code', 'کد فرآیند'),
    select('parent_id', 'گروه در معماری فرآیندها', groups),
    select('owner_org_unit_id', 'دپارتمان مالک', units),
    input('summary', 'شرح فرآیند', false, 'textarea'),
  ];
  const profileFields = [
    input('objective', 'هدف'), input('start_event', 'رویداد آغاز'), input('end_event', 'رویداد پایان'),
    input('inputs', 'ورودی‌ها', true), input('outputs', 'خروجی‌ها', true),
    input('roles', 'سمت‌های درگیر', true), input('expected_outcome', 'نتیجهٔ مورد انتظار', true),
    input('notes', 'یادداشت', true, 'textarea'),
  ];
  const processRecord = (v: Values, editing: boolean) => {
    const current = editing ? processes.find(row => row.id === v.record) : undefined;
    unique(data.nodes, v.code, current?.id);
    const row: Data['nodes'][number] = {
      kind: 'PROCESS', classification: null, ...current, id: current?.id ?? id(),
      code: v.code, name: v.name, parent_id: v.parent_id, owner_org_unit_id: v.owner_org_unit_id,
      summary: v.summary, updated_at: new Date().toISOString(),
    };
    return save({nodes: current ? data.nodes.map(node => node.id === row.id ? row : node) : [...data.nodes, row]}, '/processes/' + row.id);
  };
  const kpiFields = [
    input('name', 'نام شاخص'), input('code', 'کد شاخص'), input('description', 'تعریف شاخص', false, 'textarea'),
    input('formula_text', 'فرمول محاسبه'), input('unit', 'واحد سنجش'), input('frequency', 'تناوب'),
    input('data_source', 'منبع داده', true),
    select('readiness_status', 'آمادگی داده', [...new Set(data.kpis.map(row => row.readiness_status))].map(value => option(value, ({READY:'آمادهٔ پایش', UNASSESSED:'بررسی‌نشده', DEFINED:'تعریف‌شده', GAP:'نیازمند داده'} as Record<string,string>)[value] ?? value))),
    select('org_unit_id', 'دپارتمان مرتبط', units, true),
    select('position_id', 'سمت مرتبط', positions, true),
  ];
  const defaults = (fields: Field[], record?: object): Values => Object.fromEntries(
    fields.map(field => [field.name, String((record as Record<string, unknown> | undefined)?.[field.name] ?? '')]),
  );
  const kpiRecord = (v: Values, editing: boolean) => {
    const current = editing ? data.kpis.find(row => row.id === v.record) : undefined;
    unique(data.kpis, v.code, current?.id);
    if (Boolean(v.org_unit_id) === Boolean(v.position_id)) throw Error('یک دپارتمان یا یک سمت مرتبط انتخاب کنید.');
    const row = {
      ...current, id: current?.id ?? id(), name: v.name, code: v.code, description: v.description,
      formula_text: v.formula_text, unit: v.unit, frequency: v.frequency, data_source: nullable(v.data_source),
      readiness_status: v.readiness_status, target_value: current?.target_value ?? null,
    };
    const links = data.kpiOrgLinks ?? [];
    const existing = links.filter(link => link.kpi_id === row.id);
    const primary = existing[0];
    const unchanged = primary?.org_unit_id === nullable(v.org_unit_id) && primary?.position_id === nullable(v.position_id);
    return save({
      kpis: current ? data.kpis.map(kpi => kpi.id === row.id ? row : kpi) : [...data.kpis, row],
      kpiOrgLinks: unchanged ? links : [...links.filter(link => link !== primary && !(link.kpi_id === row.id && link.org_unit_id === nullable(v.org_unit_id) && link.position_id === nullable(v.position_id))), {
        kpi_id: row.id, org_unit_id: nullable(v.org_unit_id), position_id: nullable(v.position_id),
      }],
    }, '/kpis/' + row.id);
  };

  const positionFields = [input('title', 'عنوان سمت'), select('org_unit_id', 'دپارتمان', units),
    select('reports_to_position_id', 'سمت بالادست', positions, true)];
  const positionRecord = (v: Values, editing: boolean) => {
    const current = editing ? data.positions.find(row => row.id === v.record) : undefined;
    const row = {id: current?.id ?? id(), title: v.title, org_unit_id: v.org_unit_id,
      reports_to_position_id: nullable(v.reports_to_position_id)};
    const seen = new Set([row.id]);
    for (let parent = row.reports_to_position_id; parent; parent = data.positions.find(item => item.id === parent)?.reports_to_position_id ?? null) {
      if (seen.has(parent)) throw Error('این سمت بالادست در چارت چرخه ایجاد می‌کند.');
      seen.add(parent);
    }
    return save({positions: current ? data.positions.map(item => item.id === row.id ? row : item) : [...data.positions, row]}, '/organization/chart');
  };

  return [
    {title: 'فرآیندها', operations: [
      {title: 'تعریف فرآیند جدید', fields: processFields, prepare: v => processRecord(v, false)},
      {title: 'ویرایش فرآیند', fields: [select('record', 'فرآیند', processOptions), ...processFields],
        defaults: record => defaults(processFields, processes.find(row => row.id === record)), prepare: v => processRecord(v, true)},
      {title: 'تکمیل یا ویرایش شناسنامهٔ فرآیند', fields: [select('record', 'فرآیند', processOptions), ...profileFields],
        defaults: record => defaults(profileFields, data.profiles.find(row => row.process_id === record)),
        prepare(v) {
          const previous = data.profiles.find(row => row.process_id === v.record);
          const row = {...previous, ...Object.fromEntries(profileFields.map(field => [field.name, nullable(v[field.name])])),
            process_id: v.record, updated_at: new Date().toISOString()} as Profile;
          return save({profiles: [...data.profiles.filter(item => item.process_id !== v.record), row]}, '/processes/' + v.record);
        }},
    ]},
    {title: 'شاخص‌ها', operations: [
      {title: 'تعریف شاخص و شناسنامه', fields: kpiFields, prepare: v => kpiRecord(v, false)},
      {title: 'ویرایش شناسنامهٔ شاخص', fields: [select('record', 'شاخص', indicators), ...kpiFields],
        defaults: record => defaults(kpiFields, {...data.kpis.find(row => row.id === record), ...data.kpiOrgLinks?.find(link => link.kpi_id === record)}),
        prepare: v => kpiRecord(v, true)},
      {title: 'ساخت کارت نمودار', fields: [select('kpiId', 'شاخص', indicators), select('kind', 'نوع نمودار', [
        option('line', 'خطی'), option('bar', 'میله‌ای'), option('pie', 'دایره‌ای'),
      ])], prepare(v) {
        const model = readMonitoring(monitoringKey, initialModel(data), false);
        return {key: monitoringKey, next: {...model, cards: [...model.cards, {id: id(), kpiId: v.kpiId, kind: v.kind}]}, href: '/kpis'};
      }},
    ]},
    {title: 'چارت سازمانی', operations: [
      {title: 'تعریف سمت', fields: positionFields, prepare: v => positionRecord(v, false)},
      {title: 'ویرایش سمت و جایگاه آن', fields: [select('record', 'سمت', positions), ...positionFields],
        defaults: record => defaults(positionFields, data.positions.find(row => row.id === record)), prepare: v => positionRecord(v, true)},
      {title: 'تعریف دپارتمان', fields: [input('name', 'نام دپارتمان'), input('code', 'کد دپارتمان', true),
        select('parent_id', 'دپارتمان بالادست', units, true)], prepare(v) {
        if (v.code) unique(data.units, v.code);
        return save({units: [...data.units, {id: id(), name: v.name, code: nullable(v.code),
          parent_id: nullable(v.parent_id), sort_order: Math.max(0, ...data.units.map(row => row.sort_order)) + 1}]}, '/organization/chart');
      }},
    ]},
    {title: 'اهداف و نتایج کلیدی', operations: [
      {title: 'تعریف هدف', fields: [input('title', 'عنوان هدف'), input('description', 'شرح هدف', true, 'textarea'),
        select('cycleId', 'دوره', portfolio.cycles.map(row => option(row.id, row.title))),
        select('pillar', 'محور استراتژیک', strategicPillars(portfolio).filter(row => row.active).map(row => option(row.name, row.name))),
        select('parentId', 'هدف بالادست', portfolio.objectives.map(row => option(row.id, row.title)), true),
        select('ownerUnitId', 'دپارتمان مسئول', units, true)], prepare(v) {
        if (v.title.length < 8 || v.title.length > 220) throw Error('عنوان هدف باید بین ۸ تا ۲۲۰ کاراکتر باشد.');
        if (v.parentId && !portfolio.objectives.some(row => row.id === v.parentId && row.cycleId === v.cycleId)) {
          throw Error('هدف بالادست باید متعلق به همان دوره باشد.');
        }
        const goalId = id();
        return {key: okrKey, next: withObjective(portfolio, {id: goalId, code: 'O-' + goalId.slice(0, 8),
          title: v.title, description: v.description.slice(0, 500), cycleId: v.cycleId, pillar: v.pillar,
          level: v.parentId ? 'DEPARTMENT' : 'COMPANY', parentId: nullable(v.parentId),
          ownerUnitId: nullable(v.ownerUnitId), confidence: 'ON_TRACK'}), href: '/okr/' + goalId};
      }},
      {title: 'تعریف نتیجهٔ کلیدی', fields: [select('objectiveId', 'هدف', portfolio.objectives.map(row => option(row.id, row.title))),
        input('title', 'عنوان نتیجهٔ کلیدی'), input('baseline', 'مقدار مبنا', false, 'number'),
        input('target', 'مقدار هدف', false, 'number'), input('unit', 'واحد', true),
        select('kpiId', 'شاخص مرتبط', indicators, true)], prepare(v) {
        const baseline = Number(v.baseline), target = Number(v.target);
        if (v.title.length < 8 || v.title.length > 220) throw Error('عنوان نتیجهٔ کلیدی باید بین ۸ تا ۲۲۰ کاراکتر باشد.');
        if (!Number.isFinite(baseline) || !Number.isFinite(target) || baseline === target) throw Error('مقدار مبنا و مقدار هدف باید عددی و متفاوت باشند.');
        return {key: okrKey, next: withKeyResult(portfolio, {id: id(), objectiveId: v.objectiveId, title: v.title,
          baseline, target, current: baseline, unit: v.unit.slice(0, 25), weight: 1, kpiId: nullable(v.kpiId)}), href: '/okr/' + v.objectiveId};
      }},
    ]},
  ];
}
