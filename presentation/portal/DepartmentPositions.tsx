import {departmentPositionRows} from './department-position-rows';
import {BriefcaseBusiness} from 'lucide-react';
import {PeopleAvatars} from './PersonContacts';
import type {ChartItem, ChartDirection, DepartmentPosition} from './chart-layout';

type Props={
 item:ChartItem;
 direction?:ChartDirection;
 limit:number;
 onPosition:(id:string)=>void;
 onPeople:(position:DepartmentPosition,id?:string)=>void;
};

export function DepartmentPositions({item,limit,onPosition,onPeople,direction='vertical'}:Props){
 const positions=item.departmentPositions;
 if(!positions?.length)return null;
 const rows=departmentPositionRows(positions);
 const columns=new Map<number,number>();
 return <ul className={'flow-department-positions '+(direction==='horizontal'?'department-positions-horizontal':'')}
  style={direction==='horizontal'?{gridTemplateColumns:'repeat('+ (1+Math.max(...rows.map(row=>row.depth)))+',minmax(0,1fr))'}:undefined} aria-label={'سمت‌های '+item.label}>
  {rows.map(({position,depth})=>{
   const row=(columns.get(depth)??0)+1;
   columns.set(depth,row);
   return <li key={position.id} style={direction==='horizontal'?{gridColumn:depth+1,gridRow:row}:{marginInlineStart:Math.min(depth,5)*13}}>
   <button type="button" className="department-position-title nodrag nopan" title={position.title} onClick={event=>{event.stopPropagation();onPosition(position.id);}}>
    <BriefcaseBusiness size={14}/><strong>{position.title}</strong>
   </button>
   <PeopleAvatars people={position.people} limit={limit} onOpen={id=>onPeople(position,id)}/>
  </li>;})}
 </ul>;
}
