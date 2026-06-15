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

export function formatDDay(job) {
  if (/^D-\d+/i.test(job.deadlineLabel) || job.deadlineLabel === '오늘') {
      return job.deadlineLabel;
  }
  if (job.deadlineDate) {
      const d = new Date(job.deadlineDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      const diffTime = d - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return '오늘';
      if (diffDays > 0) return `D-${diffDays}`;
      return `D+${-diffDays}`;
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
  today.setHours(23, 59, 0, 0); // Assuming deadlines are usually 23:59
  
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
  
  const dateMatch = job.deadlineLabel.match(/(20\d{2})[-.](\d{1,2})[-.](\d{1,2})/);
  if (dateMatch) {
    return `${dateMatch[1]}.${dateMatch[2].padStart(2, '0')}.${dateMatch[3].padStart(2, '0')} 23:59`;
  }
  
  return job.deadlineLabel;
}
