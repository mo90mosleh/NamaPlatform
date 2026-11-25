import {config} from '../api';
import {portfolioIsValid, withoutProcessLinks, type OkrPortfolio} from './model';
import {sampleAutumn1405} from './sample';

export function loadPortfolio(orgId: string, orgName: string, canEdit: boolean): OkrPortfolio {
  const demo=config.mode==='public'&&/پارس تجهیز آریا/.test(orgName);
  try {
    const saved = (canEdit || config.demoManagement) ? localStorage.getItem('nama-okr-workspace-v1:' + orgId) : null;
    if (saved) {
      const value: unknown = JSON.parse(saved);
      if (portfolioIsValid(value)) {
        const portfolio=withoutProcessLinks(value);
        if(!demo||portfolio.sampleVersion===2)return portfolio;
        const sample=sampleAutumn1405(),root=sample.objectives[0];
        if(!portfolio.objectives.some(goal=>goal.id===root.id)||!portfolio.cycles.some(cycle=>cycle.id===root.cycleId))return portfolio;
        const extra=sample.objectives.slice(3).filter(goal=>!portfolio.objectives.some(item=>item.id===goal.id||item.code===goal.code));
        const ids=new Set(extra.map(goal=>goal.id));
        const merged={...portfolio,sampleVersion:2,objectives:[...portfolio.objectives,...extra],
          keyResults:[...portfolio.keyResults,...sample.keyResults.filter(result=>ids.has(result.objectiveId))]};
        try{localStorage.setItem('nama-okr-workspace-v1:'+orgId,JSON.stringify(merged));}catch{}
        return merged;
      }
    }
  } catch {/* Browser storage unavailable. */}
  return demo
    ? sampleAutumn1405() : {cycles: [], objectives: [], keyResults: [], checkins: []};
}
