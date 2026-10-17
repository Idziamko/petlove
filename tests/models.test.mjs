import assert from 'node:assert/strict';
import test from 'node:test';
import { petNoticeFromApi, userPetsFromApi, shelterFriendFromApi } from '../src/models.ts';

test('notice data preserves species, sex and category from the API', () => {
  const notice = petNoticeFromApi({
    _id: 'notice-1', title: 'Ant colony', name: 'Colony', species: 'ants',
    sex: 'multiple', category: 'lost', birthday: '2022-01-01', comment: 'Lost ant farm',
    location: { _id: 'city-1', cityEn: 'Kyiv', stateEn: 'Kyyivska' },
    imgURL: 'https://example.com/ants.webp', popularity: 12,
    user: { _id: 'user-1', phone: '+380123456789' },
  });
  assert.equal(notice.species, 'ants');
  assert.equal(notice.gender, 'multiple');
  assert.equal(notice.category, 'lost');
  assert.equal(notice.location, 'Kyiv, Kyyivska');
  assert.equal(notice.contact, 'tel:+380123456789');
});

test('a pet keeps the server ID used for deletion', () => {
  const [pet] = userPetsFromApi([{
    _id: 'server-pet-id', name: 'Rich', title: 'Playful dog', imgURL: 'https://example.com/pet.webp',
    species: 'dog', sex: 'male', birthday: '2020-09-21',
  }]);
  assert.equal(pet.id, 'server-pet-id');
  assert.equal(pet.comments, 'Playful dog');
});

test('missing partner contacts and work days do not break the directory', () => {
  const friend = shelterFriendFromApi({
    _id: 'friend-1', title: 'Partner', url: 'https://example.com', imageUrl: '',
    address: null, addressUrl: null, email: null, phone: null, workDays: null,
  });
  assert.equal(friend.time, 'By appointment');
  assert.equal(friend.email, '');
  assert.equal(friend.phone, '');
});
