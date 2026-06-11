import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import between from 'dayjs/plugin/isBetween';
import today from 'dayjs/plugin/isToday';

export const dateformat = dayjs;

dateformat.extend(utc);
dateformat.extend(timezone);
dateformat.extend(between);
dateformat.extend(today);
