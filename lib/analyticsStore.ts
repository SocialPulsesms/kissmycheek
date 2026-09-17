// Central Persistent Analytics & Charts History Store
// Kiss My Cheek — Exclusive Dating & Social Club

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  date: string;
}

export interface ActivityHistoryLog {
  id: string;
  timestamp: string;
  category: 'MATCH' | 'BILLING' | 'BOOST' | 'VERIFICATION' | 'EVENT';
  title: string;
  description: string;
  actor: string;
  status: 'COMPLETED' | 'ACTIVE' | 'FLAGGED';
  metadata?: Record<string, any>;
}

export interface AnalyticsDataset {
  timeframe: '7d' | '30d' | '90d' | '1y';
  memberGrowth: ChartDataPoint[];
  revenueFlow: ChartDataPoint[];
  matchVelocity: ChartDataPoint[];
  boostSpikes: ChartDataPoint[];
  historyLogs: ActivityHistoryLog[];
}

function getPersistenceFilePath(): string | null {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'persistent_analytics_history.json');
  } catch {
    return null;
  }
}

const DEFAULT_ANALYTICS: AnalyticsDataset = {
  timeframe: '30d',
  memberGrowth: [
    { label: 'Aug 10', date: '2026-08-10', value: 3420, secondaryValue: 280 },
    { label: 'Aug 15', date: '2026-08-15', value: 3680, secondaryValue: 340 },
    { label: 'Aug 20', date: '2026-08-20', value: 3950, secondaryValue: 410 },
    { label: 'Aug 25', date: '2026-08-25', value: 4230, secondaryValue: 490 },
    { label: 'Aug 30', date: '2026-08-30', value: 4510, secondaryValue: 580 },
    { label: 'Sep 04', date: '2026-09-04', value: 4720, secondaryValue: 640 },
    { label: 'Sep 08', date: '2026-09-08', value: 4850, secondaryValue: 710 }
  ],
  revenueFlow: [
    { label: 'Aug 10', date: '2026-08-10', value: 295000 },
    { label: 'Aug 15', date: '2026-08-15', value: 320000 },
    { label: 'Aug 20', date: '2026-08-20', value: 348000 },
    { label: 'Aug 25', date: '2026-08-25', value: 375000 },
    { label: 'Aug 30', date: '2026-08-30', value: 392000 },
    { label: 'Sep 04', date: '2026-09-04', value: 408000 },
    { label: 'Sep 08', date: '2026-09-08', value: 418500 }
  ],
  matchVelocity: [
    { label: 'Aug 10', date: '2026-08-10', value: 1240 },
    { label: 'Aug 15', date: '2026-08-15', value: 1480 },
    { label: 'Aug 20', date: '2026-08-20', value: 1650 },
    { label: 'Aug 25', date: '2026-08-25', value: 1920 },
    { label: 'Aug 30', date: '2026-08-30', value: 2150 },
    { label: 'Sep 04', date: '2026-09-04', value: 2380 },
    { label: 'Sep 08', date: '2026-09-08', value: 2640 }
  ],
  boostSpikes: [
    { label: 'Aug 10', date: '2026-08-10', value: 85 },
    { label: 'Aug 15', date: '2026-08-15', value: 112 },
    { label: 'Aug 20', date: '2026-08-20', value: 145 },
    { label: 'Aug 25', date: '2026-08-25', value: 190 },
    { label: 'Aug 30', date: '2026-08-30', value: 230 },
    { label: 'Sep 04', date: '2026-09-04', value: 285 },
    { label: 'Sep 08', date: '2026-09-08', value: 340 }
  ],
  historyLogs: []
};

export function getPersistentAnalytics(): AnalyticsDataset {
  const filePath = getPersistenceFilePath();
  if (!filePath) return DEFAULT_ANALYTICS;

  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.memberGrowth && parsed.revenueFlow) {
        if (Array.isArray(parsed.historyLogs)) {
          parsed.historyLogs = parsed.historyLogs.filter((l: any) => 
            l.category !== 'CALL' &&
            !String(l.id).startsWith('log-00') && 
            !String(l.description).includes('Alexander Sterling') &&
            !String(l.description).includes('Chidera Anya') &&
            !String(l.title).toLowerCase().includes('video date') &&
            !String(l.title).toLowerCase().includes('voice call')
          );
        }
        return parsed;
      }
    }
    // Write defaults if not existing
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_ANALYTICS, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Analytics history read error:', err);
  }
  return DEFAULT_ANALYTICS;
}

export function savePersistentAnalytics(data: AnalyticsDataset): void {
  const filePath = getPersistenceFilePath();
  if (!filePath) return;
  try {
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Analytics history write error:', err);
  }
}

export function logActivityHistoryRecord(record: Omit<ActivityHistoryLog, 'id'>): ActivityHistoryLog {
  if ((record as { category?: string }).category === 'CALL') {
    return { ...record, id: 'ignored' } as ActivityHistoryLog;
  }
  const dataset = getPersistentAnalytics();
  const newLog: ActivityHistoryLog = {
    ...record,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  };
  dataset.historyLogs.unshift(newLog);
  savePersistentAnalytics(dataset);
  return newLog;
}
