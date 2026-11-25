import type {CSSProperties} from 'react';
import {departmentPositionRows} from './department-position-rows';
import {PeopleAvatars} from './PersonContacts';
import {number} from './ui';
import type {ChartItem, DepartmentPosition} from './chart-layout';

type Props = {
 item: ChartItem;
 limit: number;
 onPosition: (id: string) => void;
 onPeople: (position: DepartmentPosition, id?: string) => void;
};

export function DepartmentPositions({item, limit, onPosition, onPeople}: Props) {
 const positions = item.departmentPositions;
 if (!positions?.length) return null;
 const rows = departmentPositionRows(positions);
 const rowById = new Map(rows.map(({position}, index) => [position.id,index]));
 return <ul className="flow-department-positions" aria-label={'سمت‌های '+item.label}>
  {rows.map(({position,depth},index) => {
   const parentIndex = position.parentId ? rowById.get(position.parentId) : undefined;
   const linked = depth > 0 && parentIndex !== undefined && parentIndex < index;
   const first = position.people[0];
   const remaining = position.people.length - 1;
   return <li key={position.id} className={linked ? 'department-position-child' : undefined}
    style={{'--level':Math.min(depth,5),'--parent-distance':linked ? index-parentIndex : 0} as CSSProperties}>
    <PeopleAvatars people={position.people} limit={limit} onOpen={id=>onPeople(position,id)}/>
    <button type="button" className="department-position-title nodrag nopan" title={position.title}
     onClick={event=>{event.stopPropagation();onPosition(position.id);}}>
     <strong>{position.title}</strong>
     <small title={first?.display_name}>{first?.display_name ?? 'بدون فرد تخصیص‌یافته'}{remaining>0&&' · '+number.format(remaining)+' نفر دیگر'}</small>
    </button>
   </li>;
  })}
 </ul>;
}
