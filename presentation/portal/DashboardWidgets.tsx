import {NamayarAvatar} from './namayar/NamayarAvatar';
import {PowerBiIcon} from './PowerBiReports';
import {groupPositions} from './position-groups';
import {useEffect,useState} from 'react';
import {Search,History,Network,ChartNoAxesCombined,Target,Pause,Play,UserRound,BriefcaseBusiness,Building2,BookOpen,Files,ArrowLeft,GitBranch,ChartColumn,Flag} from 'lucide-react';
import {ProcessIcon} from './ProcessIcon';
import {normalizeSearch} from './architecture-navigation';
import {availablePowerBiReports} from './KpiMonitoring';
import {loadPortfolio} from './okr/portfolio-storage';
import type {Data} from './types';
import {Link} from './ui';

const modules = [
 {path:'/organization/chart', name:'چارت سازمانی', detail:'واحدها، سمت‌ها و مسیرهای گزارش‌دهی را در ساختار سازمان پیدا کنید.', icon:Network, visual:Building2, hint:'از چارت شروع کنید تا افراد و مسیر گزارش‌دهی هر سمت را پیدا کنید.'},
 {path:'/architecture', name:'فرآیندها', detail:'طبقه‌بندی، زنجیره‌های ارزش و شناسنامهٔ فرآیندها را مرور کنید.', icon:ProcessIcon, visual:GitBranch, hint:'از نقشهٔ ارتباط‌ها تا ورودی‌ها، خروجی‌ها و مسئول هر فرآیند را یک‌جا ببینید.'},
 {path:'/kpis', name:'شاخص‌ها', detail:'روند عملکرد را در نمودارها دنبال کنید و تعریف و منبع دادهٔ شاخص‌ها را ببینید.', icon:ChartNoAxesCombined, visual:ChartColumn, hint:'مقدار واقعی را با هدف مقایسه کنید و تغییرات هر دوره را زیر نظر بگیرید.'},
 {path:'/okr', name:'OKR', detail:'اهداف سازمان، نتایج کلیدی و پیشرفت هر دوره را دنبال کنید.', icon:Target, visual:Flag, hint:'پیشرفت اهداف سازمان و دپارتمان‌ها را از روی نتایج کلیدی بسنجید.'},
];

const searchIcons = {بخش:BookOpen, فرآیند:ProcessIcon, شاخص:ChartNoAxesCombined, هدف:Target, 'Power BI':PowerBiIcon,
  شخص:UserRound, سمت:BriefcaseBusiness, دپارتمان:Building2, سند:Files};
function chartPath(kind:string,id:string) {
 return '/organization/chart?'+new URLSearchParams({kind,node:id});
}
function destinations(data:Data) {
 const goals=loadPortfolio(data.organization.id,data.organization.name,data.user.role==='ADMIN').objectives;
 return [
  ...modules.map(({path,name})=>({path,name,type:'بخش'})),
  {path:'/process-map',name:'نقشه فرآیندها',type:'بخش'},
  {path:'/process-governance/apqc',name:'طبقه‌بندی APQC',type:'بخش'},
  {path:'/processes',name:'شناسنامه فرآیندها',type:'بخش'},
  {path:'/documents',name:'مستندات',type:'بخش'},
  ...data.persons.map(person=>({path:chartPath('person',person.id),name:person.display_name,type:'شخص'})),
  ...groupPositions(data.positions).map(role=>({path:chartPath('position',role.id), name:role.title,type:'سمت',code:data.units.find(unit=>unit.id===role.org_unit_id)?.name})),
  ...data.units.map(unit=>({path:chartPath('unit',unit.id),name:unit.name,type:'دپارتمان',code:unit.code})),
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
 const matches=term?destinations(data).filter(item=>normalizeSearch([item.name,item.type,'code' in item?item.code:''].join(' ')).includes(term))
  .sort((a,b)=>Number(normalizeSearch(b.name)===term)-Number(normalizeSearch(a.name)===term)).slice(0,12):[];
 return <div className="dashboard-search" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
  <label><Search size={21}/><input type="search" aria-label="جست‌وجو در نما" placeholder="جست‌وجو در نما…" value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);}}/></label>
  {open&&term&&<div className="panel dashboard-search-results" aria-label="نتایج جست‌وجو">
   {matches.map(item=>{const Icon=searchIcons[item.type as keyof typeof searchIcons];return <Link key={item.path} to={item.path}><span><Icon size={17}/>{item.name}</span><small>{item.type}</small></Link>;})}
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
 const Icon=active.icon, Visual=active.visual;
 const byPath=new Map(destinations(data).map(item=>[item.path,item]));
 const visits=recent(data).flatMap(path=>{const item=byPath.get(path);return item?[item]:[];});
 return <div className="dashboard-widgets">
  <section className="panel dashboard-tour" aria-label="آشنایی با بخش‌های نما">
   <div className="dashboard-slide" data-slide={index} key={active.path}>
    <div className="dashboard-slide-copy"><h2><Icon size={20}/>{active.name}</h2><p>{active.detail}</p><p>{active.hint}</p></div>
    <div className="dashboard-slide-art" aria-hidden="true"><Visual size={72} strokeWidth={1.4}/><NamayarAvatar state="awake"/></div>
   </div>
   <footer className="dashboard-slide-footer">
   <div className="dashboard-slide-controls">{modules.map((item,i)=><button type="button" key={item.path} aria-label={item.name} aria-pressed={i===index} onClick={()=>setIndex(i)}/>)}
    <button type="button" className="icon-button" aria-label={playing?'توقف اسلایدر':'پخش اسلایدر'} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={15}/>:<Play size={15}/>}</button></div><Link className="dashboard-view-link" to={active.path} ariaLabel={'مشاهده '+active.name}>مشاهده<ArrowLeft size={15}/></Link></footer>
  </section>
  <section className="panel dashboard-recent"><h2><History size={18}/>آخرین بازدیدها</h2>
   {visits.length?<ol>{visits.map(item=><li key={item.path}><Link to={item.path}><span>{item.name}</span><small>{item.type}</small></Link></li>)}</ol>:<p className="empty-inline">هنوز بازدیدی ثبت نشده است.</p>}
  </section>
 </div>;
}
