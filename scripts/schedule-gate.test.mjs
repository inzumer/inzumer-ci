import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldRun, utcHourFor } from './schedule-gate.mjs';

const SUMMER = new Date('2026-07-03T08:00:00Z');
const WINTER = new Date('2026-12-04T08:00:00Z');

describe('schedule gate', () => {
  it('should find the UTC hour of local noon in summer and winter', () => {
    assert.equal(utcHourFor(12, 'Europe/Madrid', SUMMER), 10);
    assert.equal(utcHourFor(12, 'Europe/Madrid', WINTER), 11);
    assert.equal(utcHourFor(12, 'America/Argentina/Buenos_Aires', WINTER), 15);
  });

  it('should keep only the cron that matches the local hour', () => {
    assert.equal(shouldRun('0 10 * * 5', 12, 'Europe/Madrid', SUMMER), true);
    assert.equal(shouldRun('0 11 * * 5', 12, 'Europe/Madrid', SUMMER), false);
    assert.equal(shouldRun('30 11 * * 1', 12, 'Europe/Madrid', WINTER), true);
  });

  it('should always run manual triggers', () => {
    assert.equal(shouldRun('', 12, 'Europe/Madrid', SUMMER), true);
  });
});
