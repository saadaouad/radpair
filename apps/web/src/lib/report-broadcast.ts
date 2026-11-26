import type { ReportResponse } from '@repo/contracts';

export type ReportBroadcast = {
  tabId: string;
  version: number;
  content: ReportResponse['content'];
  status: ReportResponse['status'];
};

const channelKey = (reportId: string) => `radpair-report-${reportId}`;

export const reportTabId =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab-${Math.random().toString(36).slice(2)}`;

export const broadcastReportSaved = (reportId: string, payload: Omit<ReportBroadcast, 'tabId'>) => {
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }
  const channel = new BroadcastChannel(channelKey(reportId));
  channel.postMessage({ ...payload, tabId: reportTabId } satisfies ReportBroadcast);
  channel.close();
};

export const subscribeReportSaved = (
  reportId: string,
  onMessage: (payload: Omit<ReportBroadcast, 'tabId'>) => void
) => {
  if (typeof BroadcastChannel === 'undefined') {
    return () => {};
  }
  const channel = new BroadcastChannel(channelKey(reportId));
  const handler = (event: MessageEvent<ReportBroadcast>) => {
    if (event.data.tabId === reportTabId) {
      return;
    }
    onMessage({
      version: event.data.version,
      content: event.data.content,
      status: event.data.status
    });
  };
  channel.addEventListener('message', handler);
  return () => {
    channel.removeEventListener('message', handler);
    channel.close();
  };
};
