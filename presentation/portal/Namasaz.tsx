import {useEffect, useState, type FormEvent} from 'react';
import {ClipboardList, Goal, Network, Undo2} from 'lucide-react';
import {TargetArrowIcon} from './TargetArrowIcon';
import {Heading, Link, errorMessage} from './ui';
import {demoAdminActive} from './demo-auth';
import {namasazKeys, namasazOperations} from './namasaz-operations';
import type {Data} from './types';
import './namasaz.css';

type Preview = {key: string; next: unknown; href: string; title: string; details: {label: string; value: string}[]};
type Receipt = Preview & {before: string | null; after: (string | null)[]};
let lastOperation: {orgId: string; receipt: Receipt} | undefined;
const icons = [ClipboardList, TargetArrowIcon, Network, Goal];

export function Namasaz({data, refresh}: {data: Data; refresh: () => Promise<void>}) {
  const [category, setCategory] = useState<number>();
  const [operation, setOperation] = useState<number>();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview>();
  const [receipt, setReceipt] = useState(() => lastOperation?.orgId === data.organization.id ? lastOperation.receipt : undefined);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const keys = namasazKeys(data);
  const modules = namasazOperations(data);
  const selected = category === undefined ? undefined : modules[category];
  const action = operation === undefined ? undefined : selected?.operations[operation];
  const [baseline, setBaseline] = useState(() => snapshot());

  function snapshot() { return keys.map(key => localStorage.getItem(key)); }
  function matches(expected: (string | null)[]) {
    return snapshot().every((value, index) => value === expected[index]);
  }

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key && !keys.includes(event.key)) return;
      setPreview(undefined);
      setError('داده‌ها در برگهٔ دیگری تغییر کرده‌اند. برای ساخت پیش‌نمایش تازه، صفحه را دوباره باز کنید.');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [data.organization.id]);

  function choose(index?: number) {
    setOperation(index);
    setDraft({});
    setPreview(undefined);
    setError('');
    setMessage('');
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setError('');
    try {
      if (!matches(baseline)) throw Error('داده‌ها تغییر کرده‌اند. صفحه را دوباره باز کنید.');
      const values = Object.fromEntries(action.fields.map(field => [field.name, (draft[field.name] ?? '').trim()]));
      for (const field of action.fields) {
        const value = values[field.name];
        if ((!field.optional && !value) || (value && field.options && !field.options.some(option => option.value === value))) {
          throw Error('مقدار «' + field.label + '» را مشخص کنید.');
        }
      }
      const next = action.prepare(values);
      setPreview({...next, title: action.title, details: action.fields.map(field => ({
        label: field.label, value: field.options?.find(option => option.value === values[field.name])?.label || values[field.name] || '—',
      }))});
    } catch (err) { setError(errorMessage(err)); }
  }

  async function change(undo: boolean) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const apply = () => {
        if (!demoAdminActive()) throw Error('برای ثبت تغییر وارد فضای مدیریت دمو شوید.');
        if (undo && receipt) {
          if (!matches(receipt.after)) throw Error('پس از این عملیات داده‌ها تغییر کرده‌اند. واگردانی ممکن است ویرایش‌های بعدی را از بین ببرد.');
          if (receipt.before === null) localStorage.removeItem(receipt.key);
          else localStorage.setItem(receipt.key, receipt.before);
          lastOperation = undefined;
          setReceipt(undefined);
          setMessage('آخرین عملیات واگردانی شد.');
        } else if (!undo && preview) {
          if (!matches(baseline)) throw Error('داده‌ها بعد از پیش‌نمایش تغییر کرده‌اند. صفحه را دوباره باز کنید.');
          const before = localStorage.getItem(preview.key);
          localStorage.setItem(preview.key, JSON.stringify(preview.next));
          const saved = {...preview, before, after: snapshot()};
          lastOperation = {orgId: data.organization.id, receipt: saved};
          setReceipt(saved);
          choose();
        }
      };
      if (navigator.locks) await navigator.locks.request('nama-demo-edits', apply);
      else apply();
      try {
        await refresh();
        setBaseline(snapshot());
      } catch {
        setError('تغییر در مرورگر ذخیره شد. برای بازخوانی اطلاعات صفحه را تازه کنید.');
      }
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return <div className="namasaz" dir="rtl">
    <Heading title="نماساز" description="ساخت و ویرایش اطلاعات دمو در همین مرورگر"/>
    <div className="namasaz-grid">{modules.map((module, index) => {
      const Icon = icons[index];
      return <button className="panel namasaz-card" key={module.title} type="button" disabled={busy}
        aria-pressed={category === index} onClick={() => {setCategory(index); choose();}}>
        <Icon size={24}/><strong>{module.title}</strong>
      </button>;
    })}</div>
    {selected && <section className="panel padded namasaz-section">
      <h2>{selected.title}</h2>
      <div className="namasaz-actions">{selected.operations.map((item, index) => <button className="secondary" key={item.title}
        type="button" disabled={busy} aria-pressed={operation === index} onClick={() => choose(index)}>{item.title}</button>)}</div>
      {action && <form onSubmit={review}>
        <fieldset disabled={busy || Boolean(preview)} className="namasaz-fields">
          {action.fields.map(field => {
            const value = draft[field.name] ?? '';
            const update = (next: string) => setDraft(old => field.name === 'record'
              ? {...action.defaults?.(next), record: next} : {...old, [field.name]: next});
            return <label key={field.name}>{field.label}{field.optional && <small>اختیاری</small>}
              {field.options ? <select required={!field.optional} value={value} onChange={e => update(e.target.value)}>
                <option value="">انتخاب کنید</option>
                {field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select> : field.type === 'textarea'
                ? <textarea required={!field.optional} value={value} onChange={e => update(e.target.value)}/>
                : <input required={!field.optional} type={field.type ?? 'text'} step={field.type === 'number' ? 'any' : undefined}
                  value={value} onChange={e => update(e.target.value)}/>}
            </label>;
          })}
        </fieldset>
        {!preview && <button className="primary" type="submit" disabled={busy}>پیش‌نمایش تغییر</button>}
      </form>}
    </section>}
    {preview && <section className="panel padded namasaz-section">
      <h2>پیش‌نمایش {preview.title}</h2>
      <Details details={preview.details}/>
      <div className="namasaz-actions">
        <button className="primary" type="button" disabled={busy} onClick={() => void change(false)}>ثبت تغییر</button>
        <button className="secondary" type="button" disabled={busy} onClick={() => setPreview(undefined)}>بازگشت به فرم</button>
      </div>
    </section>}
    {receipt && <section className="panel padded namasaz-section">
      <h2>ثبت شد · {receipt.title}</h2>
      <Details details={receipt.details}/>
      <div className="namasaz-actions">
        <Link className="secondary" to={receipt.href}>مشاهدهٔ نتیجه در نما</Link>
        <button className="secondary" type="button" disabled={busy} onClick={() => void change(true)}><Undo2 size={16}/> واگردانی آخرین عملیات</button>
      </div>
    </section>}
    {message && <p role="status" className="alert">{message}</p>}
    {error && <p role="alert" className="alert warning">{error}</p>}
  </div>;
}

function Details({details}: {details: Preview['details']}) {
  return <dl className="namasaz-details">{details.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}
