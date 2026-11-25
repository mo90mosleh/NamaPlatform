import {Settings} from 'lucide-react';

export function ProcessIcon({size = 24}: {size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    <path d="M3.2 9Q4.1 5.8 7.1 4.2m-3.2-.5 3.2.5-.7 3M24.8 19q-.9 3.2-3.9 4.8m3.2.5-3.2-.5.7-3"/>
    <Settings x="3.5" y="3.5" width="21" height="21" strokeWidth={2.2}/>
  </svg>;
}
