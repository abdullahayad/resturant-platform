import { useTranslation } from 'react-i18next';
import { addDays, baghdadNow, dayOfMonth, to12h, weekdayOf } from './format';

// Friendly labels for Baghdad dates/times: "اليوم", "باچر", "الجمعة 30/10",
// "6:30 م".
export function useDateLabels() {
  const { t } = useTranslation();
  const days = t('days', { returnObjects: true }) as string[];

  const dateLabel = (date: string) => {
    const today = baghdadNow().date;
    if (date === today) return t('dates.today');
    if (date === addDays(today, 1)) return t('dates.tomorrow');
    return `${days[weekdayOf(date)]} ${dayOfMonth(date)}/${Number(date.slice(5, 7))}`;
  };

  const timeLabel = (time: string) => {
    const { clock, pm } = to12h(time);
    return `${clock} ${pm ? t('dates.pm') : t('dates.am')}`;
  };

  return { days, dateLabel, timeLabel };
}
