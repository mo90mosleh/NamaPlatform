import type{OkrPortfolio}from'./model';
import demo from '../../data/nama-okr.json';
export const autumn1405 = demo as OkrPortfolio;
export function sampleAutumn1405(): OkrPortfolio {
 return structuredClone(autumn1405);
}
