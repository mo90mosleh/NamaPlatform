import {useState, type FormEvent} from 'react';

export type PowerBiReport = {id: string; name: string; embed: string; guide: string};

export function PowerBiIcon({size = 17}: {size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="14" y="2" width="8" height="20" rx="2" fill="#e5a700"/>
    <rect x="8" y="7" width="8" height="15" rx="2" fill="#f2be1a"/>
    <rect x="2" y="12" width="8" height="10" rx="2" fill="#ffdb57"/>
  </svg>;
}

function parseHttps(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url;
  } catch {}
  return null;
}

function embedUrl(value: string) {
  const url = parseHttps(value);
  return url?.origin === 'https://app.powerbi.com' && /^\/(reportEmbed|dashboardEmbed|view)\/?$/i.test(url.pathname) ? url.href : null;
}

export function PowerBiReports({reports, canManage, onAdd, reportId}: {
  reportId?: string; reports: PowerBiReport[]; canManage: boolean; onAdd: (report: PowerBiReport) => boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState(reportId ?? '');
  const [error, setError] = useState('');
  const selected = reports.find(report => report.id === selectedId);
  const source = selected && embedUrl(selected.embed);
  const guide = selected && parseHttps(selected.guide);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const embed = embedUrl(String(data.get('embed') ?? '').trim());
    const guide = String(data.get('guide') ?? '').trim();
    if (!name || !embed || (guide && !parseHttps(guide))) {
      setError('نام، نشانی جاسازی Power BI و نشانی HTTPS راهنما را بررسی کنید.');
      return;
    }
    const report = {id: crypto.randomUUID(), name, embed, guide};
    if (onAdd(report)) {
      setSelectedId(report.id);
      setAdding(false);
      setError('');
    }
  }

  return <>
    {canManage && <div className="kpi-actions">
      <button type="button" className="secondary" aria-expanded={adding}
        onClick={() => {setAdding(!adding);setError('');}}>افزودن داشبورد</button>
    </div>}
    {adding && canManage && <form className="panel kpi-form" onSubmit={submit}>
      <label>نام داشبورد<input name="name" required maxLength={120}/></label>
      <label>لینک جاسازی Power BI<input type="url" dir="ltr" name="embed" required/></label>
      <label>لینک راهنما یا ویدئوی آموزشی<input type="url" dir="ltr" name="guide"/></label>
      <button className="primary">ذخیره داشبورد</button>
      {error && <p role="alert" className="alert error">{error}</p>}
    </form>}
    {reports.length ? <div className="kpi-actions" aria-label="داشبوردهای Power BI">
      {reports.map(report => <button key={report.id} type="button" className="secondary"
        aria-pressed={report.id === selectedId} onClick={() => setSelectedId(report.id)}>{report.name}</button>)}
    </div> : <p className="empty-inline">هنوز داشبوردی ثبت نشده است.</p>}
    {selectedId && !selected && <p className="empty-inline">داشبورد در دسترس نیست.</p>}
    {selected && source && <section className="panel kpi-monitor-card">
      <h2>{selected.name}</h2>
      {guide && <a href={guide.href} target="_blank" rel="noopener noreferrer">راهنمای داشبورد</a>}
      <iframe className="power-bi-frame" src={source} title={selected.name} allow="fullscreen"/>
    </section>}
  </>;
}
