import assert from 'node:assert/strict'
import test from 'node:test'
import {stageDuration} from '../frontend/src/stageDuration.ts'

const format = value => stageDuration(value).replaceAll('\u202f', ' ')

test('garde une donnée absente et les secondes jusqu’au seuil', () => {
  assert.equal(format(null), '')
  assert.equal(format(0), '0 s')
  assert.equal(format(15.8), '15,8 s')
  assert.equal(format(60), '60 s')
})

test('formate les minutes avec la décimale et gère l’arrondi des secondes', () => {
  assert.equal(format(60.1), '1 min 0,1 s')
  assert.equal(format(641.2), '10 min 41,2 s')
  assert.equal(format(119.96), '2 min 0 s')
  assert.equal(format(3600), '60 min 0 s')
})

test('formate les heures au-delà de soixante minutes', () => {
  assert.equal(format(3600.1), '1 h 0 min 0,1 s')
  assert.equal(format(3661.2), '1 h 1 min 1,2 s')
  assert.equal(format(7199.96), '2 h 0 min 0 s')
})
