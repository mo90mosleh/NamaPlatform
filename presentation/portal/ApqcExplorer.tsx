import {useState} from 'react';
import {ChevronLeft, ArrowRight, Layers3} from 'lucide-react';
import {apqcByCode, apqcChildren, apqcContains, apqcParent, apqcTrail} from './apqc-reference';
import {apqcSource, categories} from './process-governance';
import type {Data} from './types';
import {Link, number} from './ui';

const titleFor = (code: string) => categories.find(([key]) => key === code)?.[1] ?? apqcByCode.get(code) ?? 'نیازمند بررسی';

export function ApqcExplorer({data}: {data: Data}) {
  const [branch, setBranch] = useState('');
  const processes = data.nodes.filter(node => node.kind === 'PROCESS');
  const categoryFor = (id: string) => data.governance?.[id]?.apqc ?? '';
  const isMapped = (id: string) => apqcByCode.has(categoryFor(id));
  const count = (code: string) => number.format(processes.filter(node => apqcContains(code, categoryFor(node.id))).length);
  const children = apqcChildren.get(branch) ?? [];
  const assigned = processes.filter(node => branch === 'unmapped' ? !isMapped(node.id) : categoryFor(node.id) === branch);
  const renderCards = (codes: string[]) => <div className="apqc-grid">{codes.map(code => (
    <button type="button" key={code} className="apqc-card" onClick={() => setBranch(code)}>
      <span><bdi>{code}</bdi><Layers3 size={18}/></span>
      <strong dir={code.endsWith('.0') ? 'rtl' : 'auto'}>{titleFor(code)}</strong>
      <small>({count(code)})</small>
    </button>
  ))}</div>;

  return <section className="panel governance-panel apqc-explorer">
    <header className="apqc-heading"><h2>طبقه‌بندی APQC</h2><a href={apqcSource} target="_blank" rel="noreferrer">مرجع میان‌صنعتی ۷٫۴</a></header>
    <nav className="apqc-trail" aria-label="مسیر طبقه‌بندی APQC">
      {branch && <button type="button" className="icon-button" aria-label="بازگشت به سطح قبل" onClick={() => setBranch(branch === 'unmapped' ? '' : apqcParent(branch))}><ArrowRight size={17}/></button>}
      <button type="button" className="text-button" aria-current={!branch?'page':undefined} onClick={() => setBranch('')}>همه دسته‌ها</button>
      {apqcTrail(branch).map(code => <span key={code}><ChevronLeft size={14}/><button type="button" className="text-button" aria-current={code === branch?'page':undefined} onClick={() => setBranch(code)}>{code !== 'unmapped' && <bdi>{code}</bdi>} {titleFor(code)}</button></span>)}
    </nav>
    {!branch ? <>
      <section className="apqc-band"><h3>فرایندهای عملیاتی</h3>{renderCards(categories.slice(0, 6).map(([code]) => code))}</section>
      <section className="apqc-band apqc-support"><h3>فرایندهای مدیریتی و پشتیبان</h3>{renderCards(categories.slice(6).map(([code]) => code))}</section>
      {processes.some(node => !isMapped(node.id)) && <button type="button" className="secondary" onClick={() => setBranch('unmapped')}>نیازمند بررسی ({number.format(processes.filter(node => !isMapped(node.id)).length)})</button>}
    </> : <>
      {children.length > 0 && renderCards(children.map(node => node.code))}
      {assigned.length > 0 && <section className="apqc-assigned"><h3>فرایندهای ثبت‌شده در این سطح</h3><ul>{assigned.map(node => <li key={node.id}><Link to={'/processes/' + node.id}><bdi>{node.code}</bdi> · {node.name}</Link></li>)}</ul></section>}
      {children.length === 0 && assigned.length === 0 && <p className="empty-inline">فرایندی در این دسته ثبت نشده است.</p>}
    </>}
    <details className="apqc-attribution" dir="ltr"><summary>APQC attribution</summary>
      <p>APQC’s Process Classification Framework® (PCF) is an open standard developed by APQC, a nonprofit that promotes benchmarking and best practices worldwide. The PCF is intended to facilitate organizational improvement through process management and benchmarking, regardless of industry, size, or geography. To download the full PCF or industry-specific versions of the PCF, as well as associated measures and benchmarking, please visit <a href="https://www.apqc.org/pcf">www.apqc.org/pcf</a>.</p>
    </details>
  </section>;
}
