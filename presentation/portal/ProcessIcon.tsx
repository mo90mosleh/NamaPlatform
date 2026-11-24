import {Settings} from 'lucide-react';

export function ProcessIcon({size = 24}: {size?: number}) {
  return <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">
    <path d="M6.7 26.2A12 12 0 0 1 13 5.1m-3-2.3 3 2.3-2.6 2.8M22 22a10.4 10.4 0 0 0-.2-19.5m2.5-1.1-2.5 1.1 1.3 2.7"/>
    <Settings x="4.7" y="10.4" width="15.7" height="15.7" strokeWidth={2.5}/>
    <Settings x="15" y="6.1" width="10.1" height="10.1" strokeWidth={3.6}/>
  </svg>;
}
