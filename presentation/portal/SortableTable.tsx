import {useState, type MouseEvent} from 'react';
import {ArrowDown, ArrowDownUp, ArrowUp} from 'lucide-react';
import {go} from './ui';
import './sortable-table.css';

const collator = new Intl.Collator('fa', {numeric:true, sensitivity:'base'});
type SortValue = string | number | null | undefined;

export function useTableSort() {
 const [sort,setSort] = useState<{column:number; direction:'ascending'|'descending'}>();
 function header(label:string,column:number) {
  const direction=sort?.column===column?sort.direction:undefined;
  const Arrow=direction==='ascending'?ArrowUp:direction==='descending'?ArrowDown:ArrowDownUp;
  return <th key={column} scope="col" aria-sort={direction}><button type="button" className="table-sort" onClick={()=>
   setSort(direction==='descending'?undefined:{column,direction:direction==='ascending'?'descending':'ascending'})}>
   {label}<Arrow size={13} aria-hidden="true"/>
  </button></th>;
 }
 function ordered<T>(rows:T[],value:(item:T,column:number)=>SortValue) {
  if(!sort)return rows;
  return [...rows].sort((a,b)=>{
   const left=value(a,sort.column),right=value(b,sort.column);
   if(left==null)return right==null?0:1;
   if(right==null)return -1;
   const difference=typeof left==='number'&&typeof right==='number'?left-right:collator.compare(String(left),String(right));
   return sort.direction==='ascending'?difference:-difference;
  });
 }
 return {header,ordered};
}

export function openTableRow(event:MouseEvent<HTMLTableRowElement>,path:string) {
 if(event.defaultPrevented||event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||
    (event.target instanceof Element && event.target.closest('a,button,input,select,textarea'))||
    window.getSelection()?.toString())return;
 go(path);
}
