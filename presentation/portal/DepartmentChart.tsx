import {useEffect,useMemo,useRef} from 'react';
import {Building2,ChevronLeft} from 'lucide-react';
import {Avatar} from './PersonContacts';
import {departmentGroups,type DepartmentGroup,type DepartmentMember} from './department-chart';
import type {Data} from './types';
import './department-chart.css';

type Props={
 data:Data;
 selectedId:string|null;
 centerRequest:{id:string;nonce:number}|null;
 onUnit:(id:string)=>void;
 onPerson:(member:DepartmentMember,unitName:string)=>void;
};

export function DepartmentChart({data,selectedId,centerRequest,onUnit,onPerson}:Props){
 const departments=useMemo(()=>departmentGroups(data),[data]);
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!centerRequest)return;
  const target=container.current?.querySelector<HTMLElement>('[data-department-id="'+CSS.escape(centerRequest.id)+'"]');
  target?.scrollIntoView({block:'nearest',inline:'nearest'});
 },[centerRequest]);
 function section({unit,members,children}:DepartmentGroup,nested=false){
  return <section key={unit.id} data-department-id={unit.id} className={nested?'department-subgroup':'department-box'} aria-label={unit.name}>
   <h2><button type="button" aria-current={unit.id===selectedId?'location':undefined} onClick={()=>onUnit(unit.id)}>
    <Building2 size={16}/><span>{unit.name}</span><ChevronLeft size={14}/>
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
   {children.map(child=>section(child,true))}
  </section>;
 }
 return <div className="department-chart" ref={container} aria-label="دپارتمان‌ها و افراد" tabIndex={0}>
  {departments.map(department=>section(department))}
 </div>;
}
