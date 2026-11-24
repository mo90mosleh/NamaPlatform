import type {Data, Person, Position, Unit} from './types';

export type DepartmentMember = {person:Person; positions:Position[]; leads:boolean};
export type DepartmentGroup = {
 unit:Unit;
 members:DepartmentMember[];
 children:DepartmentGroup[];
};

export function departmentGroups({units,positions,assignments,persons}:Data):DepartmentGroup[] {
 const personById=new Map(persons.map(person=>[person.id,person]));
 const positionById=new Map(positions.map(position=>[position.id,position]));
 const unitsById=new Map(units.map(unit=>[unit.id,unit]));
 const supervisors=new Set(positions.map(position=>position.reports_to_position_id));
 const membersByUnit=new Map<string,Map<string,DepartmentMember>>();
 for(const {person_id,position_id} of assignments) {
  const person=personById.get(person_id),position=positionById.get(position_id);
  if(!person||!position||!unitsById.has(position.org_unit_id))continue;
  const members=membersByUnit.get(position.org_unit_id)??new Map<string,DepartmentMember>();
  const member=members.get(person.id)??{person,positions:[],leads:false};
  if(!member.positions.some(item=>item.id===position.id))member.positions.push(position);
  member.leads ||= supervisors.has(position.id);
  members.set(person.id,member);
  membersByUnit.set(position.org_unit_id,members);
 }
 const sorted=[...units].sort((a,b)=>a.sort_order-b.sort_order);
 const childrenByParent=new Map<string,Unit[]>();
 for(const unit of sorted) {
  if(!unit.parent_id||unit.parent_id===unit.id)continue;
  const children=childrenByParent.get(unit.parent_id)??[];
  children.push(unit);
  childrenByParent.set(unit.parent_id,children);
 }
 const visited=new Set<string>();
 function group(unit:Unit):DepartmentGroup {
  visited.add(unit.id);
  const members=[...(membersByUnit.get(unit.id)?.values()??[])].sort((a,b)=>Number(b.leads)-Number(a.leads));
  const children:DepartmentGroup[]=[];
  for(const child of childrenByParent.get(unit.id)??[]){
   if(!visited.has(child.id))children.push(group(child));
  }
  return {unit,members,children};
 }
 const roots=sorted.filter(unit=>!unit.parent_id||unit.parent_id===unit.id||!unitsById.has(unit.parent_id));
 const departments=roots.filter(unit=>!visited.has(unit.id)).map(unit=>group(unit));
 for(const unit of sorted)if(!visited.has(unit.id))departments.push(group(unit));
 return departments;
}
