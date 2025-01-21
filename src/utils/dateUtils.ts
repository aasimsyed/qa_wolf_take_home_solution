import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export interface ArticleTime {
  value: number;
  unit: string;
}

export function parseHNTime(timeString: string): ArticleTime {
  const match = timeString.match(/(\d+)\s+(\w+)\s+ago/);
  if (!match) {
    throw new Error(`Invalid time string format: ${timeString}`);
  }

  return {
    value: parseInt(match[1], 10),
    unit: match[2],
  };
}

export function convertToMinutes(time: ArticleTime): number {
  const unitMap: { [key: string]: number } = {
    minute: 1,
    minutes: 1,
    hour: 60,
    hours: 60,
    day: 1440,
    days: 1440,
  };

  const multiplier = unitMap[time.unit];
  if (!multiplier) {
    throw new Error(`Unsupported time unit: ${time.unit}`);
  }

  return time.value * multiplier;
}

export function isChronologicallyOrdered(times: string[]): boolean {
  const minutes = times.map((t) => convertToMinutes(parseHNTime(t)));
  
  for (let i = 1; i < minutes.length; i++) {
    if (minutes[i] < minutes[i - 1]) {
      return false;
    }
  }
  
  return true;
} 