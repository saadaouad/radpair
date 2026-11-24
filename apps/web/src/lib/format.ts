const examDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

export const formatExamDate = (value: string) => examDateFormat.format(new Date(value));

export const statusLabel = (status: 'unread' | 'draft' | 'signed') => {
  if (status === 'unread') {
    return 'Unread';
  }
  if (status === 'draft') {
    return 'Draft';
  }
  return 'Signed';
};
