import {useState, type FormEvent} from 'react';
import {ArrowUpLeft, ChartNoAxesCombined, ClipboardList, Plus, Target, Search, Trash2} from 'lucide-react';
import {config} from './api';
import {availablePowerBiReports} from './KpiMonitoring';
import {loadPortfolio} from './okr/portfolio-storage';
import {PowerBiIcon} from './PowerBiReports';
import type {Data} from './types';
import {normalizeSearch} from './architecture-navigation';
import {Modal} from './Modal';
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
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [remove, setRemove] = useState<Shortcut | null>(null);
  const [error, setError] = useState('');
  const choices = destinations[kind].filter(item => !links.some(link => link.kind === kind && link.id === item.id));

  const matches = choices.filter(item => normalizeSearch(item.name).includes(normalizeSearch(query)));
  const picked = choices.find(item => item.id === id);

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
      setQuery('');
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
      <label>نوع لینک<select value={kind} onChange={event => {setKind(event.target.value as Kind);setId('');setQuery('');setSearchOpen(false);}}>
        {kinds.map(value => <option key={value} value={value}>{types[value].label}</option>)}
      </select></label>
      <div className="quick-destination" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setSearchOpen(false);}}
        onKeyDown={event=>{if(event.key==='Escape')setSearchOpen(false);}}>
        <label>مقصد<input type="search" placeholder="جست‌وجوی مقصد" value={searchOpen ? query : picked?.name ?? query}
          onFocus={()=>setSearchOpen(true)} onClick={()=>setSearchOpen(true)}
          onChange={event=>{setQuery(event.target.value);setId('');setSearchOpen(true);}}
          aria-expanded={searchOpen} aria-controls={searchOpen?'quick-destinations':undefined}/></label>
        {searchOpen&&<div id="quick-destinations" className="panel quick-destination-options" role="group" aria-label="نتایج مقصد">
          {matches.map(item=><button type="button" key={item.id} onClick={()=>{setId(item.id);setQuery('');setSearchOpen(false);}}>{item.name}</button>)}
          {!matches.length&&<p className="empty-inline">مقصدی پیدا نشد.</p>}
        </div>}
      </div>
      <button className="primary" disabled={!id}>ذخیره لینک</button>
    </form>}
    {error && <p className="alert error" role="alert">{error}</p>}
    {links.length ? <ul className="quick-link-grid">{links.map(link => {
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
          title="حذف لینک" onClick={() => setRemove(link)}><Trash2 size={15}/></button>
      </li>;
    })}</ul> : <p className="empty-inline">هنوز لینک سریعی اضافه نکرده‌اید.</p>}
    {remove&&<Modal className="quick-link-confirm panel" label="حذف لینک سریع" onClose={()=>setRemove(null)}>
      <h2>این لینک سریع حذف شود؟</h2>
      <div className="quick-link-confirm-actions"><button autoFocus type="button" className="secondary" onClick={()=>setRemove(null)}>انصراف</button>
      <button type="button" className="primary" onClick={()=>{if(save(links.filter(link=>link!==remove)))setRemove(null);}}>حذف لینک</button></div>
    </Modal>}
  </section>;
}
