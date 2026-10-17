import assert from 'node:assert/strict';
import test from 'node:test';
import { friendHours } from '../src/friendHours.ts';

test('missing working hours never imply a business is open all day', () => {
  assert.equal(friendHours(null), 'Not provided');
  assert.equal(friendHours([]), 'Not provided');
});

test('closed days do not hide the next available opening hours', () => {
  assert.equal(friendHours([{ isOpen: false }, { isOpen: true, from: '09:00', to: '17:00' }]), '09:00 - 17:00');
  assert.equal(friendHours([{ isOpen: false }]), 'Closed');
  assert.equal(friendHours([{ isOpen: true }]), 'By appointment');
});

test('day and night is shown only for a supplied full day schedule', () => {
  assert.equal(friendHours([{ isOpen: true, from: '00:00', to: '23:59' }]), 'Day and night');
});
