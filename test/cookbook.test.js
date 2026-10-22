const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateRecipes } = require('../scripts/cookbook');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recipies.json'), 'utf8'));

test('current catalog has valid, unique recipe records', () => {
  assert.deepEqual(validateRecipes(catalog), []);
});

test('catalog rejects duplicate IDs and missing directions', () => {
  const recipe = {
    id: 'same', title: 'Soup', servings: 2, time: '20m', tags: ['dinner'],
    ingredients: [{ item: 'water' }], steps: ['Heat the water.']
  };

  const errors = validateRecipes([recipe, { ...recipe, steps: [] }]);

  assert.ok(errors.some(error => error.includes('duplicate id')));
  assert.ok(errors.some(error => error.includes('direction')));
});

test('ingredient entries need readable ingredient text', () => {
  const recipe = {
    id: 'one', title: 'Soup', servings: 2, time: '20m', tags: [],
    ingredients: [{}], steps: ['Heat the water.']
  };

  assert.ok(validateRecipes([recipe]).some(error => error.includes('ingredient 1')));
});