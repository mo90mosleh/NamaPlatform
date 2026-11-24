import {useEffect,useState} from 'react';
import {Search,History,Network,ChartNoAxesCombined,Target,Pause,Play} from 'lucide-react';
import {ProcessIcon} from './ProcessIcon';
import {normalizeSearch} from './architecture-navigation';
import {availablePowerBiReports} from './KpiMonitoring';
import {loadPortfolio} from './okr/portfolio-storage';
import type {Data} from './types';
import {Link} from './ui';

const modules = [
 {path:'/organization/chart', name:'چارت سازمانی', detail:'واحدها، سمت‌ها و مسیرهای گزارش‌دهی را در ساختار سازمان پیدا کنید.', icon:Network},
 {path:'/architecture', name:'فرآیندها', detail:'طبقه‌بندی، زنجیره‌های ارزش و شناسنامهٔ فرآیندها را مرور کنید.', icon:ProcessIcon},
 {path:'/kpis', name:'شاخص‌ها', detail:'روند عملکرد را در نمودارها دنبال کنید و تعریف و منبع دادهٔ شاخص‌ها را ببینید.', icon:ChartNoAxesCombined},
 {path:'/okr', name:'OKR', detail:'اهداف سازمان، نتایج کلیدی و پیشرفت هر دوره را دنبال کنید.', icon:Target},
];

function destinations(data:Data) {
 const goals=loadPortfolio(data.organization.id,data.organization.name,data.user.role==='ADMIN').objectives;
 return [
  ...modules.map(({path,name})=>({path,name,type:'بخش'})),
  {path:'/process-map',name:'نقشه فرآیندها',type:'بخش'},
  {path:'/process-governance/apqc',name:'طبقه‌بندی APQC',type:'بخش'},
  {path:'/processes',name:'شناسنامه فرآیندها',type:'بخش'},
  {path:'/documents',name:'مستندات',type:'بخش'},
  ...data.nodes.filter(node=>node.kind==='PROCESS').map(node=>({path:'/processes/'+node.id,name:node.name,type:'فرآیند',code:node.code})),
  ...data.kpis.map(kpi=>({path:'/kpis/'+kpi.id,name:kpi.name,type:'شاخص',code:kpi.code})),
  ...goals.map(goal=>({path:'/okr/'+goal.id,name:goal.title,type:'هدف',code:goal.code})),
  ...availablePowerBiReports(data).map(report=>({path:'/kpis/power-bi/'+report.id,name:report.name,type:'Power BI'})),
 ];
}
const historyKey=(data:Data)=>'nama-recent-v1:'+JSON.stringify([data.organization.id,data.user.email.toLowerCase()]);
function recent(data:Data):string[]{
 try {
  const saved:unknown=JSON.parse(localStorage.getItem(historyKey(data))??'[]');
  return Array.isArray(saved)?saved.filter((path):path is string=>typeof path==='string').slice(0,10):[];
 }catch{return [];}
}
export function rememberVisit(data:Data,path:string){
 if(!destinations(data).some(item=>item.path===path))return;
 try{localStorage.setItem(historyKey(data),JSON.stringify([path,...recent(data).filter(item=>item!==path)].slice(0,10)));}catch{}
}

export function DashboardSearch({data}:{data:Data}){
 const [query,setQuery]=useState('');
 const [open,setOpen]=useState(false);
 const term=normalizeSearch(query.trim());
 const matches=term?destinations(data).filter(item=>normalizeSearch([item.name,item.type,'code' in item?item.code:''].join(' ')).includes(term)).slice(0,12):[];
 return <div className="dashboard-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
  <label><Search size={21}/><input type="search" aria-label="جست‌وجو در نما" placeholder="جست‌وجو در نما…" value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);}}/></label>
  {open&&term&&<div className="panel dashboard-search-results" aria-label="نتایج جست‌وجو">
   {matches.map(item=><Link key={item.path} to={item.path}><span>{item.name}</span><small>{item.type}</small></Link>)}
   {!matches.length&&<p className="empty-inline">نتیجه‌ای پیدا نشد.</p>}
  </div>}
 </div>;
}

export function DashboardWidgets({data}:{data:Data}){
 const [index,setIndex]=useState(0);
 const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{
  if(!playing)return;
  const timer=window.setInterval(()=>setIndex(value=>(value+1)%modules.length),5000);
  return ()=>window.clearInterval(timer);
 },[playing,index]);
 const active=modules[index];
 const Icon=active.icon;
 const byPath=new Map(destinations(data).map(item=>[item.path,item]));
 const visits=recent(data).flatMap(path=>{const item=byPath.get(path);return item?[item]:[];});
 return <div className="dashboard-widgets">
  <section className="panel dashboard-tour" aria-label="آشنایی با بخش‌های نما">
   <div className="dashboard-slide" key={active.path}><Icon size={40}/><h2>{active.name}</h2><p>{active.detail}</p><Link className="secondary" to={active.path}>باز کردن {active.name}</Link></div>
   <div className="dashboard-slide-controls">{modules.map((item,i)=><button type="button" key={item.path} aria-label={item.name} aria-pressed={i===index} onClick={()=>setIndex(i)}/>)}
    <button type="button" className="icon-button" aria-label={playing?'توقف اسلایدر':'پخش اسلایدر'} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={15}/>:<Play size={15}/>}</button></div>
  </section>
  <section className="panel dashboard-recent"><h2><History size={18}/>آخرین بازدیدها</h2>
   {visits.length?<ol>{visits.map(item=><li key={item.path}><Link to={item.path}><span>{item.name}</span><small>{item.type}</small></Link></li>)}</ol>:<p className="empty-inline">هنوز بازدیدی ثبت نشده است.</p>}
  </section>
 </div>;
}
