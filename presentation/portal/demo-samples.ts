import type {Data, ProcessRelation} from './types';

export const demoValueChains = [
  {title:'سفارش تا تحویل', codes:['P-11','P-01','P-02','P-23','P-06']},
  {title:'تأمین تا آزادسازی محصول', codes:['P-14','P-03','P-20','P-16','P-04','P-05']},
  {title:'درخواست تا مرجوعی', codes:['P-25','P-07','P-24']},
];

const teams = [
  ['d8dd58ea','عملیات فروش','کارشناس فروش',['آوا صادقی','آرمان نادری']],
  ['e314bd6f','خط مونتاژ','اپراتور مونتاژ',['لیلا کریمی','پویا محمودی','رضا جعفری']],
  ['273d3012','آزمایشگاه کیفیت','کارشناس آزمون',['مریم اسدی','فرهاد امینی']],
  ['9422edd2','مرکز پاسخ‌گویی','کارشناس پشتیبانی',['سارا رفیعی','مانی یوسفی']],
] as const;

const sampleId = (group: number, index: number) =>
  'e97a4256-4600-43c8-9200-' + String(group * 1000 + index).padStart(12,'0');

export function withDemoSamples(data: Data): Data {
  const units = [...data.units], positions = [...data.positions], persons = [...data.persons], assignments = [...data.assignments];
  teams.forEach(([managerPrefix, team, title, names], index) => {
    const manager = data.positions.find(position => position.id.startsWith(managerPrefix));
    if (!manager) return;
    const unitId = sampleId(1,index), positionId = sampleId(2,index);
    units.push({id:unitId, parent_id:manager.org_unit_id, name:team, code:'TEAM-'+(index+1), sort_order:index});
    positions.push({id:positionId, org_unit_id:unitId, reports_to_position_id:manager.id, title});
    names.forEach((display_name, seat) => {
      const person_id = sampleId(3,index*10+seat);
      persons.push({id:person_id, display_name, email:null, phone:null});
      assignments.push({id:sampleId(4,index*10+seat), person_id, position_id:positionId});
    });
  });
  const byCode = new Map(data.nodes.filter(node => node.kind === 'PROCESS').map(node => [node.code,node.id]));
  const relations: ProcessRelation[] = [...(data.relations ?? [])];
  demoValueChains.forEach(({codes}, chain) => codes.slice(1).forEach((code,index) => {
    const source_process_id = byCode.get(codes[index]), target_process_id = byCode.get(code);
    if (!source_process_id || !target_process_id || relations.some(relation =>
      relation.source_process_id === source_process_id && relation.target_process_id === target_process_id &&
      relation.relation_type === 'OUTPUT_TO')) return;
    relations.push({id:sampleId(5,chain*10+index), source_process_id, target_process_id, relation_type:'OUTPUT_TO'});
  }));
  return {...data, units, positions, persons, assignments, relations};
}
