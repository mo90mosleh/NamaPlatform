import {useEffect,useMemo,useRef} from 'react';
import {Building2,ChevronLeft} from 'lucide-react';
import {Avatar} from './PersonContacts';
import {departmentGroups,type DepartmentGroup,type DepartmentMember} from './department-chart';
import type {ChartItem} from './chart-layout';
import type {ChartAnalysisMode} from './chart-insights';
import {number} from './ui';
import type {Data} from './types';
import './department-chart.css';

type Props={
 data:Data;
 analysis:ChartAnalysisMode;
 items:ChartItem[];
 selectedId:string|null;
 centerRequest:{id:string;nonce:number}|null;
 onUnit:(id:string)=>void;
 onPerson:(member:DepartmentMember,unitName:string)=>void;
};

export function DepartmentChart({data,analysis,items,selectedId,centerRequest,onUnit,onPerson}:Props){
 const departments=useMemo(()=>departmentGroups(data),[data]);
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!centerRequest)return;
  const target=container.current?.querySelector<HTMLElement>('[data-department-id="'+CSS.escape(centerRequest.id)+'"]');
  target?.scrollIntoView({block:'nearest',inline:'nearest'});
 },[centerRequest]);
 const byId=new Map(items.map(item=>[item.id,item]));
 function section({unit,members,children}:DepartmentGroup,depth=0){
  const item=byId.get(unit.id);
  return <div key={unit.id} className="department-branch">
   <section data-department-id={unit.id} className={depth>1?'department-subgroup':'department-box'} aria-label={unit.name}
    style={analysis==='department'&&item?.tone?{backgroundColor:item.tone}:undefined}>
   <h2><button type="button" aria-current={unit.id===selectedId?'location':undefined} onClick={()=>onUnit(unit.id)}>
    <Building2 size={16}/><span>{unit.name}</span>
    {item?.analysisLabel&&<small className="department-metric">{number.format(item.analysisValue??0)} {item.analysisLabel}</small>}
    <ChevronLeft size={14}/>
   </button></h2>
   {members.length>0&&<ul className="department-people">
    {members.map(member=><li key={member.person.id} className={member.leads?'department-lead':undefined}>
     <button type="button" className="department-person" onClick={()=>onPerson(member,unit.name)}>
      <Avatar person={member.person}/>
      <span><strong>{member.person.display_name}</strong>
       <small>{[...new Set(member.positions.map(position=>position.title))].join('، ')}</small>
      </span>
     </button>
    </li>)}
   </ul>}
   {!members.length&&!children.length&&<p className="empty-inline">فردی به این واحد تخصیص داده نشده است.</p>}
   {depth>0&&children.length>0&&<div className="department-descendants">{children.map(child=>section(child,depth+1))}</div>}
   </section>
   {depth===0&&children.length>0&&<div className="department-roots-children">{children.map(child=>section(child,1))}</div>}
  </div>;
 }
 return <div className="department-chart" ref={container} aria-label="دپارتمان‌ها و افراد" tabIndex={0}>
  {departments.map(department=>section(department))}
 </div>;
}
