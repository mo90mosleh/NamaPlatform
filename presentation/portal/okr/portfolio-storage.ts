import {config} from '../api';
import {portfolioIsValid, withoutProcessLinks, type OkrPortfolio} from './model';
import {sampleAutumn1405} from './sample';

export function loadPortfolio(orgId: string, orgName: string, canEdit: boolean): OkrPortfolio {
  try {
    const saved = (canEdit || config.demoManagement) ? localStorage.getItem('nama-okr-workspace-v1:' + orgId) : null;
    if (saved) {
      const value: unknown = JSON.parse(saved);
      if (portfolioIsValid(value)) return withoutProcessLinks(value);
    }
  } catch {/* Browser storage unavailable. */}
  return config.mode === 'public' && /پارس تجهیز آریا/.test(orgName)
    ? sampleAutumn1405() : {cycles: [], objectives: [], keyResults: [], checkins: []};
}
