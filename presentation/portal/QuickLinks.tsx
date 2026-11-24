import {useState, type FormEvent} from 'react';
import {ArrowUpLeft, ChartNoAxesCombined, ClipboardList, Plus, Target, X} from 'lucide-react';
import {config} from './api';
import {availablePowerBiReports} from './KpiMonitoring';
import {loadPortfolio} from './okr/portfolio-storage';
import {PowerBiIcon} from './PowerBiReports';
import type {Data} from './types';
import {Link} from './ui';
import './quick-links.css';

const types = {
  process: {label: 'فرآیند', icon: ClipboardList, route: '/processes/'},
  kpi: {label: 'شاخص', icon: ChartNoAxesCombined, route: '/kpis/'},
  objective: {label: 'هدف', icon: Target, route: '/okr/'},
  powerBi: {label: 'داشبورد Power BI', icon: PowerBiIcon, route: '/kpis/power-bi/'},
};
type Kind = keyof typeof types;
type Shortcut = {kind: Kind; id: string};
type Destination = {id: string; name: string};
const kinds = Object.keys(types) as Kind[];

function loadShortcuts(key: string, defaults: Shortcut[]): Shortcut[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(value)) {
      return value.filter((item): item is Shortcut =>
        item && kinds.includes(item.kind) && typeof item.id === 'string');
    }
  } catch {/* Browser storage unavailable. */}
  return defaults;
}

export function QuickLinks({data}: {data: Data}) {
  const portfolio = loadPortfolio(data.organization.id, data.organization.name, data.user.role === 'ADMIN');
  const destinations: Record<Kind, Destination[]> = {
    process: data.nodes.filter(node => node.kind === 'PROCESS'),
    kpi: data.kpis,
    objective: portfolio.objectives.map(goal => ({id: goal.id, name: goal.title})),
    powerBi: availablePowerBiReports(data),
  };
  const owner = data.user.email.trim().toLowerCase() || (config.demoManagement ? 'demo-browser' : data.user.name);
  const key = 'nama-quick-links-v1:' + JSON.stringify([data.organization.id, owner]);
  const defaults = config.demoManagement
    ? kinds.flatMap(kind => destinations[kind][0] ? [{kind, id: destinations[kind][0].id}] : [])
    : [];
  return <QuickLinkList key={key} storageKey={key} defaults={defaults} destinations={destinations}/>;
}

function QuickLinkList({storageKey, defaults, destinations}: {
  storageKey: string; defaults: Shortcut[]; destinations: Record<Kind, Destination[]>;
}) {
  const [links, setLinks] = useState(() => loadShortcuts(storageKey, defaults));
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<Kind>('process');
  const [id, setId] = useState('');
  const [error, setError] = useState('');
  const choices = destinations[kind].filter(item => !links.some(link => link.kind === kind && link.id === item.id));

  function save(next: Shortcut[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setLinks(next);
      setError('');
      return true;
    } catch {
      setError('ذخیرهٔ لینک‌های سریع در مرورگر انجام نشد.');
      return false;
    }
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (choices.some(item => item.id === id) && save([...links, {kind, id}])) {
      setId('');
      setAdding(false);
    }
  }

  return <section className="panel quick-links" aria-labelledby="quick-links-title">
    <header className="quick-links-heading">
      <h2 id="quick-links-title">لینک‌های سریع</h2>
      <button type="button" className="secondary" aria-expanded={adding} aria-controls={adding ? 'quick-link-form' : undefined}
        onClick={() => setAdding(!adding)}><Plus size={16}/>افزودن لینک</button>
    </header>
    {adding && <form id="quick-link-form" className="quick-link-form" onSubmit={add}>
      <label>نوع لینک<select value={kind} onChange={event => {setKind(event.target.value as Kind);setId('');}}>
        {kinds.map(value => <option key={value} value={value}>{types[value].label}</option>)}
      </select></label>
      <label>مقصد<select required value={id} onChange={event => setId(event.target.value)}>
        <option value="">{choices.length ? 'انتخاب مقصد' : 'مقصدی برای افزودن وجود ندارد'}</option>
        {choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <button className="primary" disabled={!id}>ذخیره لینک</button>
    </form>}
    {error && <p className="alert error" role="alert">{error}</p>}
    {links.length ? <ul className="quick-link-grid">{links.map((link, index) => {
      const type = types[link.kind];
      const Icon = type.icon;
      const item = destinations[link.kind].find(destination => destination.id === link.id);
      const label = item?.name ?? 'مقصد در دسترس نیست';
      const content = <>
        <span className="quick-link-icon" aria-hidden="true"><Icon size={19}/></span>
        <span className="quick-link-copy"><strong>{label}</strong><small>{type.label}</small></span>
      </>;
      return <li key={link.kind + ':' + link.id} data-kind={link.kind}>
        {item ? <Link className="quick-link-target" to={type.route + encodeURIComponent(link.id)}>{content}<ArrowUpLeft size={15}/></Link>
          : <span className="quick-link-target">{content}</span>}
        <button type="button" className="icon-button" aria-label={'حذف لینک ' + label}
          onClick={() => save(links.filter((_, position) => position !== index))}><X size={15}/></button>
      </li>;
    })}</ul> : <p className="empty-inline">هنوز لینک سریعی اضافه نکرده‌اید.</p>}
  </section>;
}
