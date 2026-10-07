// Campus events always display in Ann Arbor's timezone, regardless of device settings.
const EVENT_TIME_ZONE = 'America/Detroit';

export function formatEventDate(startsAt) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(startsAt));
}

export function formatEventTime(startsAt, endsAt) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone: EVENT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
}

export function formatFullEventDate(startsAt, endsAt) {
  return `${formatEventDate(startsAt)} · ${formatEventTime(startsAt, endsAt)}`;
}
