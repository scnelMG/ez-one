export function deadlineRank(job) {
  const explicitDate = parseDeadlineDate(job);
  if (explicitDate) {
    return explicitDate.getTime();
  }

  const relativeDate = parseRelativeDeadlineDate(job);
  return relativeDate ? relativeDate.getTime() : Number.MAX_SAFE_INTEGER;
}

export function isDeadlineWithinDays(job, days) {
  const rank = deadlineRank(job);
  if (rank === Number.MAX_SAFE_INTEGER) return false;

  const now = Date.now();
  return rank >= now - 86400000 && rank <= now + (days * 24 * 60 * 60 * 1000);
}

export function statusClass(status) {
  return {
    NOT_STARTED: 'status-not-started',
    READY: 'status-not-started',
    IN_PROGRESS: 'status-in-progress',
    SUBMITTED: 'status-submitted',
    COMPLETED: 'status-submitted',
    NOT_APPLIED: 'status-not-applied'
  }[status] ?? 'status-not-applied';
}

export function statusLabel(status, fallback) {
  return {
    NOT_STARTED: '지원 전',
    READY: '지원 전',
    IN_PROGRESS: '진행중',
    SUBMITTED: '지원완료',
    COMPLETED: '지원완료',
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

export function formatDDay(job) {
  const label = String(job.deadlineLabel ?? '').trim();
  if (/^D[-+]\d+/i.test(label) || label === 'D-Day') {
    return label;
  }
  if (label.startsWith('오늘')) {
    return '오늘';
  }

  const deadline = parseDeadlineDate(job);
  if (deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return '오늘';
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${-diffDays}`;
  }
  return null;
}

export function parseDeadlineDate(job) {
  if (job.deadlineDate) {
    const deadlineDate = new Date(job.deadlineDate);
    if (!Number.isNaN(deadlineDate.getTime())) {
      return deadlineDate;
    }
  }

  const label = String(job.deadlineLabel ?? '').trim();
  const dateMatch = label.match(/(20\d{2})\s*(?:[-.]|년)\s*(\d{1,2})\s*(?:[-.]|월)\s*(\d{1,2})/);
  if (dateMatch) {
    return new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
  }

  return null;
}

function parseRelativeDeadlineDate(job) {
  const label = String(job.deadlineLabel ?? '').trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (label === '오늘' || label === '?ㅻ뒛' || label === 'D-Day') {
    return today;
  }

  const dMinus = label.match(/^D-(\d+)$/i);
  if (dMinus) {
    const date = new Date(today);
    date.setDate(today.getDate() + Number(dMinus[1]));
    return date;
  }

  const dPlus = label.match(/^D\+(\d+)$/i);
  if (dPlus) {
    const date = new Date(today);
    date.setDate(today.getDate() - Number(dPlus[1]));
    return date;
  }

  return null;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return null;
  const str = dateStr.replace('T', ' ');
  if (str.includes(':')) {
    return str.replace(/-/g, '.').substring(0, 16);
  }
  return str.replace(/-/g, '.') + ' 23:59';
}

export function formatAbsoluteDeadline(job) {
  if (job.deadlineDate) {
    return formatDateTime(job.deadlineDate);
  }
  if (!job.deadlineLabel || job.deadlineLabel === '기한없음' || job.deadlineLabel === '상시채용') {
    return job.deadlineLabel || '-';
  }

  const today = new Date();
  today.setHours(23, 59, 0, 0);

  if (job.deadlineLabel === '오늘') {
    return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')} 23:59`;
  }

  const dDayMatch = job.deadlineLabel.match(/D-(\d+)/i);
  if (dDayMatch) {
    const diffDays = parseInt(dDayMatch[1], 10);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diffDays);
    return `${targetDate.getFullYear()}.${String(targetDate.getMonth() + 1).padStart(2, '0')}.${String(targetDate.getDate()).padStart(2, '0')} 23:59`;
  }

  const parsedDate = parseDeadlineDate(job);
  if (parsedDate) {
    return `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, '0')}.${String(parsedDate.getDate()).padStart(2, '0')} 23:59`;
  }

  return job.deadlineLabel;
}
