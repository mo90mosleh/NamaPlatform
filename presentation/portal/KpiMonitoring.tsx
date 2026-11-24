import {useEffect, useState, type FormEvent, type ReactNode} from 'react';
import {LayoutDashboard, ClipboardList, Plus, Save} from 'lucide-react';
import type {Data, KPI} from './types';
import {number} from './ui';
import {JalaliDatePicker} from './JalaliDatePicker';
import {PowerBiIcon, PowerBiReports, type PowerBiReport} from './PowerBiReports';
import './kpi-monitoring.css';
import {config} from './api';

type ChartKind = 'line' | 'bar' | 'pie';
type Card = {id: string; kpiId: string; kind: ChartKind};
type Revision = {value: number; note: string; actor: string; savedAt: string};
type Measurement = {kpiId: string; date: string; revisions: Revision[]};
type Model = {cards: Card[]; measurements: Measurement[]; reports: PowerBiReport[]; samplesInitialized: boolean};

const empty: Model = {cards: [], measurements: [], reports: [], samplesInitialized: true};
const charts = {line: 'خطی', bar: 'میله‌ای', pie: 'دایره‌ای'} as const;
const tabs = [
  ['dashboard', 'داشبورد شاخص‌ها', LayoutDashboard],
  ['profiles', 'شناسنامه شاخص‌ها', ClipboardList],
  ['power-bi', 'PowerBI', PowerBiIcon],
] as const;
const colors = ['#16786e', '#406ea8', '#a65b16', '#8e54a1', '#a34755', '#517344'];
const dates = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Tehran'});
const timestamps = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran'});
const labelDate = (date: string) => dates.format(new Date(date + 'T12:00:00Z'));
const current = (measurement: Measurement) => measurement.revisions[measurement.revisions.length - 1];
function storageKey(data: Data) { return 'nama-kpi-monitoring-v1:' + data.organization.id; }

const sampleSeries = [
  {code: 'K-01', kind: 'line', values: [18, 16, 13, 12]},
  {code: 'K-02', kind: 'bar', values: [76, 84, 81, 92]},
  {code: 'K-03', kind: 'bar', values: [71, 79, 85, 89]},
  {code: 'K-07', kind: 'line', values: [7, 6, 5, 4]},
] as const;

function initialModel(data: Data): Model {
  const cards: Card[] = [];
  const measurements: Measurement[] = [];
  for (const {code, kind, values} of sampleSeries) {
    const kpi = data.kpis.find(item => item.code === code);
    if (!kpi) continue;
    cards.push({id: 'sample-' + code, kpiId: kpi.id, kind});
    values.forEach((value, index) => {
      const date = ['2026-10-24', '2026-11-01', '2026-11-08', '2026-11-15'][index];
      measurements.push({kpiId: kpi.id, date, revisions: [{value, note: 'داده نمونه دمو', actor: 'دمو', savedAt: date + 'T12:00:00Z'}]});
    });
  }
  return {cards, measurements, reports: [], samplesInitialized: true};
}

function read(key: string, initial = empty): Model {
  try {
    const saved: Model | null = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(saved?.cards) && Array.isArray(saved.measurements)) {
      const reports = Array.isArray(saved.reports) ? saved.reports : [];
      if (saved.samplesInitialized) return {...saved, reports};
      return {
        cards: [...saved.cards, ...initial.cards.filter(sample => !saved.cards.some(card => card.kpiId === sample.kpiId))],
        measurements: [...saved.measurements, ...initial.measurements.filter(sample =>
          !saved.measurements.some(row => row.kpiId === sample.kpiId))],
        reports,
        samplesInitialized: true,
      };
    }
  } catch {}
  return initial;
}

const samplePowerBiReport: PowerBiReport = {
  id: 'sample-public-esg',
  name: 'نمونه Power BI · داشبورد ESG',
  embed: 'https://app.powerbi.com/view?r=eyJrIjoiYjc2ZTEyZjItODI0Yi00NzY2LWJkNTMtODAwYjNlNWNjYTQ5IiwidCI6IjUwZDhjMTE1LWI3N2YtNDM5NS1hM2JhLTNiNDA3Y2FmMGQ4OCIsImMiOjh9',
  guide: 'https://democracy.lbhf.gov.uk/documents/s120652/Appendix%201%20-%20Responsible%20Investment%20Statement%20LBHF%202022.pdf',
};

function visibleReports(reports: PowerBiReport[]) {
  return config.demoManagement ? [samplePowerBiReport, ...reports] : reports;
}

export function availablePowerBiReports(data: Data) {
  return visibleReports(read(storageKey(data)).reports);
}

export function latestKpiValue(data: Data, id: string) {
  const latest = read(storageKey(data), initialModel(data)).measurements.filter(row => row.kpiId === id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest && current(latest);
}

function Chart({kpi, kind, rows}: {kpi: KPI; kind: ChartKind; rows: Measurement[]}) {
  if (!rows.length) return <p className="empty-inline">در این بازه مقداری ثبت نشده است.</p>;
  const values = rows.map(row => current(row).value);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (kind === 'pie' && (values.some(value => value < 0) || total <= 0 || !Number.isFinite(total))) {
    return <p className="empty-inline">نمودار دایره‌ای به مقادیر غیرمنفی با مجموع بیشتر از صفر نیاز دارد.</p>;
  }
  let cumulative = 0;
  const segments = kind === 'pie' ? values.map((value, index) => {
    const start = cumulative;
    cumulative += value / total * 100;
    return colors[index % colors.length] + ' ' + start + '% ' + cumulative + '%';
  }) : [];
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const scale = Math.max(Math.abs(low), Math.abs(high)) || 1;
  const range = high / scale - low / scale || 1;
  const y = (value: number) => 122 - (value / scale - low / scale) / range * 103;
  const spacing = 300 / rows.length;
  const first = Date.parse(rows[0].date);
  const last = Date.parse(rows[rows.length - 1].date);
  const x = (index: number) => kind === 'line' && last > first
    ? 23 + (Date.parse(rows[index].date) - first) / (last - first) * 300
    : 23 + (index + 0.5) * spacing;
  return <>
    {kind === 'pie' ? <div className="kpi-pie" aria-hidden="true" style={{background: 'conic-gradient(' + segments.join(',') + ')'}}/> :
      <svg className="kpi-plot" viewBox="0 0 345 144" aria-hidden="true">
        <line x1="23" y1={y(0)} x2="323" y2={y(0)} stroke="currentColor" opacity=".25"/>
        {kind === 'line' && <polyline points={values.map((value, index) => x(index) + ',' + y(value)).join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/>}
        {values.map((value, index) => kind === 'line' ?
          <circle key={rows[index].date} cx={x(index)} cy={y(value)} r="3" fill="currentColor"><title>{labelDate(rows[index].date)} · {number.format(value)}</title></circle> :
          <rect key={rows[index].date} x={x(index) - Math.min(12, spacing * .33)} y={Math.min(y(value), y(0))}
            width={Math.min(24, spacing * .66)} height={Math.max(1, Math.abs(y(value) - y(0)))} rx="2" fill="currentColor"><title>{labelDate(rows[index].date)} · {number.format(value)}</title></rect>)}
      <text x="23" y="140" fill="currentColor" fontSize="9" textAnchor="start">{labelDate(rows[0].date)}</text>
        {rows.length > 1 && <text x="323" y="140" fill="currentColor" fontSize="9" textAnchor="end">{labelDate(rows[rows.length - 1].date)}</text>}
      </svg>}
    <details className="kpi-chart-values"><summary>مقادیر نمودار {kpi.unit && '(' + kpi.unit + ')'}</summary>
      <ul>{rows.map((row, index) => <li key={row.date}>
        {kind === 'pie' && <i aria-hidden="true" style={{backgroundColor: colors[index % colors.length]}}/>}
        {labelDate(row.date)} · {number.format(values[index])}
        {kind === 'pie' && ' · ' + number.format(values[index] / total * 100) + '٪'}
      </li>)}</ul>
    </details>
  </>;
}

export function KpiMonitoring({data, profiles, reportId}: {data: Data; reportId?: string; profiles: (values: ReadonlyMap<string, number>) => ReactNode}) {
  const key = storageKey(data);
  const [model, setModel] = useState(() => read(key, initialModel(data)));
  const [tab, setTab] = useState<(typeof tabs)[number][0]>(reportId ? 'power-bi' : 'dashboard');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryKpi, setEntryKpi] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [cardDraft, setCardDraft] = useState<Card | null>(null);
  const [message, setMessage] = useState<{text: string; error?: boolean} | null>(null);
  const admin = data.user.role === 'ADMIN';
  const selected = data.kpis.find(kpi => kpi.id === entryKpi);
  const existing = model.measurements.find(row => row.kpiId === entryKpi && row.date === entryDate);
  const history = model.measurements.filter(row => row.kpiId === entryKpi).sort((a, b) => b.date.localeCompare(a.date));
  const dateError = Boolean(start && end && start > end);

  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key || event.key === null) setModel(read(key, initialModel(data))); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);

  function update(change: (saved: Model) => Model, success: string) {
    try {
      const next = change(read(key, initialModel(data)));
      localStorage.setItem(key, JSON.stringify(next));
      setModel(next);
      setMessage({text: success});
      return true;
    } catch {
      setMessage({text: 'ذخیره در این مرورگر انجام نشد.', error: true});
      return false;
    }
  }

  function saveMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!admin || !selected || !entryDate || !value.trim() || !Number.isFinite(Number(value))) return;
    const revision = {value: Number(value), note: note.trim(), actor: data.user.name || data.user.email, savedAt: new Date().toISOString()};
    const saved = update(model => {
      const row = model.measurements.find(item => item.kpiId === entryKpi && item.date === entryDate);
      const measurements = row ? model.measurements.map(item => item === row ? {...row, revisions: [...row.revisions, revision]} : item)
        : [...model.measurements, {kpiId: entryKpi, date: entryDate, revisions: [revision]}];
      return {...model, measurements};
    }, 'مقدار شاخص ذخیره شد.');
    if (saved) { setValue(''); setNote(''); }
  }

  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cardDraft?.kpiId) return;
    const card = {...cardDraft, id: cardDraft.id || crypto.randomUUID()};
    const saved = update(model => ({...model, cards: cardDraft.id ?
      model.cards.map(item => item.id === card.id ? card : item) : [...model.cards, card]}), 'کارت ذخیره شد.');
    if (saved) setCardDraft(null);
  }

  const selectKpi = (id: string, change: (id: string) => void) => <select required value={id} onChange={event => change(event.target.value)}>
    <option value="">انتخاب شاخص</option>
    {data.kpis.map(kpi => <option key={kpi.id} value={kpi.id}>{kpi.name} ({kpi.code})</option>)}
  </select>;

  return <div className="kpi-workspace">
    {tab === 'dashboard' && <div className="kpi-date-filters">
        <JalaliDatePicker label="از تاریخ" value={start} onChange={setStart}/>
        <JalaliDatePicker label="تا تاریخ" value={end} onChange={setEnd}/>
    </div>}
    <nav className="process-workspace-tabs" aria-label="بخش‌های شاخص‌های عملکرد">
      {tabs.map(([id, title, Icon]) => <button key={id} type="button" className={tab === id ? 'active' : ''}
        aria-current={tab === id ? 'page' : undefined} onClick={() => {setTab(id); setMessage(null);}}><Icon size={17}/>{title}</button>)}
    </nav>
    {message && <p className={'alert ' + (message.error ? 'error' : 'success')} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
    {tab === 'profiles' && profiles(new Map([...model.measurements]
      .sort((a, b) => a.date.localeCompare(b.date)).map(row => [row.kpiId, current(row).value])))}
    {tab === 'dashboard' && <>
      {dateError && <p role="alert" className="alert error">تاریخ پایان باید برابر یا بعد از تاریخ شروع باشد.</p>}
      <div className="kpi-actions">
        <button type="button" className="secondary" aria-expanded={entryOpen}
          onClick={() => setEntryOpen(!entryOpen)}><Save size={16}/>ثبت مقادیر</button></div>
    {tab === 'dashboard' && entryOpen && <>
      {admin && <form className="panel kpi-form" onSubmit={saveMeasurement}>
        <label>شاخص{selectKpi(entryKpi, id => {setEntryKpi(id);setValue('');setNote('');})}</label>
        <JalaliDatePicker label="تاریخ اندازه‌گیری" value={entryDate}
          onChange={date => {setEntryDate(date);setValue('');setNote('');}}/>
        <label>مقدار واقعی {selected?.unit && '(' + selected.unit + ')'}<input type="number" step="any" required value={value} onChange={event => setValue(event.target.value)}/></label>
        <label>توضیح اختیاری<input maxLength={300} value={note} onChange={event => setNote(event.target.value)}/></label>
        {existing && <p className="kpi-form-note">مقدار فعلی این تاریخ {number.format(current(existing).value)} است. مقدار جدید همراه با سابقهٔ اصلاح ذخیره می‌شود.</p>}
        <button className="primary" disabled={!entryDate}><Save size={16}/>{existing ? 'ثبت اصلاح' : 'ثبت مقدار'}</button>
      </form>}
      {!admin && <><p className="empty-inline">ثبت و اصلاح مقدار در حالت مدیریت در دسترس است.</p><div className="kpi-form"><label>شاخص{selectKpi(entryKpi, setEntryKpi)}</label></div></>}
      {selected && <section className="panel kpi-monitor-card"><h2>سابقهٔ مقادیر</h2>
        {!history.length && <p className="empty-inline">هنوز مقداری برای این شاخص ثبت نشده است.</p>}
        {history.map(row => <details key={row.date} className="kpi-chart-values">
          <summary>{labelDate(row.date)} · {number.format(current(row).value)} {selected.unit}</summary>
          <ul>{[...row.revisions].reverse().map((revision, index) => <li key={index}>
            {number.format(revision.value)} {selected.unit} · {revision.actor} · {timestamps.format(new Date(revision.savedAt))}
            {revision.note && ' · ' + revision.note}
          </li>)}</ul>
        </details>)}
      </section>}
    </>}
      {!model.cards.length && <p className="panel empty-inline">برای ساخت داشبورد، اولین کارت را اضافه کنید.</p>}
      <div className="kpi-card-grid">{model.cards.map(card => {
        const kpi = data.kpis.find(item => item.id === card.kpiId);
        const rows = dateError ? [] : model.measurements.filter(row => row.kpiId === card.kpiId &&
          (!start || row.date >= start) && (!end || row.date <= end)).sort((a, b) => a.date.localeCompare(b.date));
        return <section className="panel kpi-monitor-card" key={card.id}>
          <header><div><h2>{kpi?.name ?? 'شاخص در دسترس نیست'}</h2><small>{charts[card.kind]}{rows.some(row => current(row).actor === 'دمو') && ' · داده نمونه'}{kpi?.unit && ' · ' + kpi.unit}</small></div>
            <div className="kpi-actions"><button className="text-button" type="button" onClick={() => setCardDraft(card)}>ویرایش</button>
              <button className="text-button" type="button" onClick={() => {
                if (update(model => ({...model, cards: model.cards.filter(item => item.id !== card.id)}), 'کارت حذف شد.') && cardDraft?.id === card.id) setCardDraft(null);
              }}>حذف کارت</button></div>
          </header>
          {kpi && !dateError && <Chart kpi={kpi} kind={card.kind} rows={rows}/>}
        </section>;
      })}</div>
      <div className="kpi-actions kpi-add-card"><button type="button" className="secondary" disabled={!data.kpis.length}
        onClick={() => setCardDraft({id: '', kpiId: '', kind: 'line'})}><Plus size={16}/>افزودن کارت</button></div>
      {cardDraft && <form className="panel kpi-form" onSubmit={saveCard}>
        <label>شاخص{selectKpi(cardDraft.kpiId, kpiId => setCardDraft({...cardDraft, kpiId}))}</label>
        <label>نوع نمودار<select value={cardDraft.kind} onChange={event => setCardDraft({...cardDraft, kind: event.target.value as ChartKind})}>
          {Object.entries(charts).map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select></label>
        {cardDraft.kind === 'pie' && <p className="kpi-form-note">فقط برای شاخص‌هایی انتخاب کنید که مجموع مقادیر تاریخ‌های انتخاب‌شده معنادار است.</p>}
        <button className="primary">ذخیرهٔ کارت</button>
        <button type="button" className="secondary" onClick={() => setCardDraft(null)}>انصراف</button>
      </form>}

    </>}
    {tab === 'power-bi' && <PowerBiReports reportId={reportId} reports={visibleReports(model.reports)} canManage={admin}
      onAdd={report => update(saved => ({...saved, reports: [...saved.reports, report]}), 'داشبورد ذخیره شد.')}/>}
  </div>;
}
