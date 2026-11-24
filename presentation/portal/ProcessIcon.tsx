import {Settings} from 'lucide-react';

export function ProcessIcon({size = 24}: {size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    <path d="M14 26A12 12 0 0 1 6.8 4.4M3.4 4.4h3.4v3.4M14 2a12 12 0 0 1 7.2 21.6m3.4 0h-3.4v-3.4"/>
    <Settings x="4.6" y="4.6" width="18.8" height="18.8" strokeWidth={2.2}/>
  </svg>;
}
