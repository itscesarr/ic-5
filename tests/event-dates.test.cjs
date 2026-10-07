const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/date.js'), 'utf8');

function formatInDeviceZone(timeZone, startsAt, endsAt) {
  const script = `
    ${source.replace(/export /g, '')}
    console.log(JSON.stringify({
      date: formatEventDate(${JSON.stringify(startsAt)}),
      time: formatEventTime(${JSON.stringify(startsAt)}, ${JSON.stringify(endsAt)}),
      full: formatFullEventDate(${JSON.stringify(startsAt)}, ${JSON.stringify(endsAt)})
    }));
  `;
  return JSON.parse(execFileSync(process.execPath, ['-e', script], {
    env: { ...process.env, TZ: timeZone, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' },
    encoding: 'utf8',
  }));
}

test('cards and details keep the campus weekday and time across device timezones', () => {
  for (const deviceZone of ['America/Detroit', 'America/Los_Angeles', 'UTC', 'Asia/Tokyo']) {
    assert.deepEqual(formatInDeviceZone(deviceZone, '2026-09-01T23:55:00.000Z', '2026-09-02T06:00:00.000Z'), {
      date: 'Tue, Sep 1',
      time: '7:55 PM - 2:00 AM',
      full: 'Tue, Sep 1 · 7:55 PM - 2:00 AM',
    });
  }
});

test('a UTC date boundary keeps the previous campus day in winter standard time', () => {
  const result = formatInDeviceZone('Asia/Tokyo', '2026-01-02T00:30:00.000Z', '2026-01-02T02:00:00.000Z');
  assert.equal(result.date, 'Thu, Jan 1');
  assert.equal(result.time, '7:30 PM - 9:00 PM');
});

test('campus times follow the spring daylight saving transition', () => {
  const result = formatInDeviceZone('UTC', '2026-03-08T06:30:00.000Z', '2026-03-08T07:30:00.000Z');
  assert.equal(result.date, 'Sun, Mar 8');
  assert.equal(result.time, '1:30 AM - 3:30 AM');
});
