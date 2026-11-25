import type {Data, ProcessRelation} from './types';

export const demoValueChains = [
  {title:'سفارش تا تحویل', codes:['P-11','P-01','P-02','P-23','P-06']},
  {title:'تأمین تا آزادسازی محصول', codes:['P-14','P-03','P-20','P-16','P-04','P-05']},
  {title:'درخواست تا مرجوعی', codes:['P-25','P-07','P-24']},
];

const teams = [
  ['e314bd6f','اپراتور مونتاژ',['لیلا کریمی','پویا محمودی','رضا جعفری']],
  ['273d3012','کارشناس آزمون',['مریم اسدی','فرهاد امینی']],
  ['9422edd2','کارشناس پشتیبانی',['سارا رفیعی','مانی یوسفی']],
] as const;

const salesSupervisors = [
  {name:'مهدی رستمی', specialists:['آوا صادقی','آرمان نادری','سارا محمودی']},
  {name:'الهام موسوی', specialists:['حسین کریمی','نازنین حیدری','امیر رضایی']},
];

const sampleId = (group: number, index: number) =>
  'e97a4256-4600-43c8-9200-' + String(group * 1000 + index).padStart(12,'0');

export function withDemoSamples(data: Data): Data {
  const units = [...data.units], positions = data.positions.map(position=>({...position})), persons = [...data.persons], assignments = [...data.assignments];
  const femaleNames = new Set(['لیلا کریمی','مریم اسدی','سارا رفیعی','آوا صادقی','سارا محمودی','الهام موسوی','نازنین حیدری']);
  const femaleAvatars = [1,3,5,7,9];
  const maleAvatars = [0,2,4,6,8];
  function addPerson(display_name: string, position_id: string, index: number) {
    const person_id = sampleId(3,index);
    const portraits = femaleNames.has(display_name) ? femaleAvatars : maleAvatars;
    const avatar_data_url = data.persons[portraits[index%portraits.length]]?.avatar_data_url;
    persons.push({id:person_id, display_name, email:null, phone:'0900 000 '+(120+index).toString().padStart(4,'0'),
      extension:String(400+index), avatar_data_url});
    assignments.push({id:sampleId(4,index), person_id, position_id});
  }
  teams.forEach(([managerPrefix, title, names], index) => {
    const manager = data.positions.find(position => position.id.startsWith(managerPrefix));
    if (!manager) return;
    const positionId = sampleId(2,index+1);
    positions.push({id:positionId, org_unit_id:manager.org_unit_id, reports_to_position_id:manager.id, title});
    names.forEach((name,seat) => addPerson(name,positionId,(index+1)*10+seat));
  });
  const sales = positions.find(position => position.id.startsWith('d8dd58ea'));
  if (sales) {
    sales.title = 'مدیر فروش';
    salesSupervisors.forEach(({name,specialists},index) => {
      const supervisorId = sampleId(2,100+index);
      positions.push({id:supervisorId,org_unit_id:sales.org_unit_id,reports_to_position_id:sales.id,title:'سرپرست فروش'});
      addPerson(name,supervisorId,100+index);
      specialists.forEach((name,seat) => {
        const sampleIndex = 110+index*3+seat;
        const specialistId = sampleId(2,sampleIndex);
        positions.push({id:specialistId,org_unit_id:sales.org_unit_id,reports_to_position_id:supervisorId,title:'کارشناس فروش'});
        addPerson(name,specialistId,sampleIndex);
      });
    });
  }
  const byCode = new Map(data.nodes.filter(node => node.kind === 'PROCESS').map(node => [node.code,node.id]));
  const relations: ProcessRelation[] = [...(data.relations ?? [])];
  demoValueChains.forEach(({codes}, chain) => codes.slice(1).forEach((code,index) => {
    const source_process_id = byCode.get(codes[index]), target_process_id = byCode.get(code);
    if (!source_process_id || !target_process_id || relations.some(relation =>
      relation.source_process_id === source_process_id && relation.target_process_id === target_process_id &&
      relation.relation_type === 'OUTPUT_TO')) return;
    relations.push({id:sampleId(5,chain*10+index), source_process_id, target_process_id, relation_type:'OUTPUT_TO'});
  }));
  const nodes = data.nodes.map(node=>{
    const ordinal = Number(node.code?.match(/^P-(\d+)$/)?.[1]);
    if(node.kind!=='PROCESS'||!Number.isFinite(ordinal))return node;
    const sampleDate=(month:number,day:number)=>new Date(Date.UTC(2026,month-1,day)).toISOString();
    return {...node, created_at:node.created_at??sampleDate(4,ordinal),
      updated_at:node.updated_at??(node.created_at?undefined:sampleDate(10,ordinal))};
  });
  return {...data, nodes, units, positions, persons, assignments, relations};
}
