export function deadlineRank(job) {
  if (job.deadlineDate) {
    const time = Date.parse(job.deadlineDate);
    if (!Number.isNaN(time)) {
      return time;
    }
  }
  const source = job.deadlineDate ?? job.deadlineLabel ?? '';
  const explicit = source.match(/(20\d{2})[-.](\d{1,2})[-.](\d{1,2})/);
  if (explicit) {
    return new Date(Number(explicit[1]), Number(explicit[2]) - 1, Number(explicit[3])).getTime();
  }
  const dDay = source.match(/D-(\d+)/i);
  return dDay ? Number(dDay[1]) : Number.MAX_SAFE_INTEGER;
}

export function statusClass(status) {
  return {
    NOT_STARTED: 'status-not-started',
    IN_PROGRESS: 'status-in-progress',
    SUBMITTED: 'status-submitted',
    NOT_APPLIED: 'status-not-applied'
  }[status] ?? 'status-not-applied';
}

export function statusLabel(status, fallback) {
  return {
    NOT_STARTED: '지원 전',
    IN_PROGRESS: '진행중',
    SUBMITTED: '지원완료',
    NOT_APPLIED: '미지원'
  }[status] ?? fallback ?? '미지원';
}

export function normalizedSourceUrl(sourceUrl) {
  const trimmed = String(sourceUrl ?? '').trim();
  if (!trimmed) {
    return '#';
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function companyInitial(companyName) {
  return (companyName ?? '?').trim().charAt(0).toUpperCase() || '?';
}

export function formatParticipantCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count.toLocaleString('ko-KR') : '0';
}
