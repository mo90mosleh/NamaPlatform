import {departmentPositionRows} from './department-position-rows';
import {BriefcaseBusiness} from 'lucide-react';
import {PeopleAvatars} from './PersonContacts';
import type {ChartItem, DepartmentPosition} from './chart-layout';

type Props={
 item:ChartItem;
 limit:number;
 onPosition:(id:string)=>void;
 onPeople:(position:DepartmentPosition,id?:string)=>void;
};

export function DepartmentPositions({item,limit,onPosition,onPeople}:Props){
 const positions=item.departmentPositions;
 if(!positions?.length)return null;
 return <ul className="flow-department-positions" aria-label={'سمت‌های '+item.label}>
  {departmentPositionRows(positions).map(({position,depth})=><li key={position.id} style={{marginInlineStart:Math.min(depth,5)*13}}>
   <button type="button" className="department-position-title nodrag nopan" title={position.title} onClick={event=>{event.stopPropagation();onPosition(position.id);}}>
    <BriefcaseBusiness size={14}/><strong>{position.title}</strong>
   </button>
   <PeopleAvatars people={position.people} limit={limit} onOpen={id=>onPeople(position,id)}/>
  </li>)}
 </ul>;
}
