const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT, 'recipies.json');

function validateRecipes(recipes) {
  const errors = [];
  if (!Array.isArray(recipes)) return ['Catalog must be an array.'];

  const ids = new Set();
  recipes.forEach((recipe, index) => {
    const label = `Recipe ${index + 1}`;
    if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    if (typeof recipe.id !== 'string' || !recipe.id.trim()) {
      errors.push(`${label} must have a non-empty string id.`);
    } else if (ids.has(recipe.id)) {
      errors.push(`${label} has duplicate id "${recipe.id}".`);
    } else {
      ids.add(recipe.id);
    }

    if (typeof recipe.title !== 'string' || !recipe.title.trim()) {
      errors.push(`${label} must have a non-empty title.`);
    }
    if (!Number.isFinite(recipe.servings) || recipe.servings <= 0) {
      errors.push(`${label} servings must be a positive number.`);
    }
    if (typeof recipe.time !== 'string' || !recipe.time.trim()) {
      errors.push(`${label} must have a non-empty preparation time.`);
    }
    if (!Array.isArray(recipe.tags) || recipe.tags.some(tag => typeof tag !== 'string' || !tag.trim())) {
      errors.push(`${label} tags must be an array of non-empty strings.`);
    }
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      errors.push(`${label} must have at least one ingredient.`);
    } else {
      recipe.ingredients.forEach((ingredient, ingredientIndex) => {
        const whole = typeof ingredient?.whole === 'string' && ingredient.whole.trim();
        const item = typeof ingredient?.item === 'string' && ingredient.item.trim();
        if (!whole && !item) {
          errors.push(`${label} ingredient ${ingredientIndex + 1} needs whole text or an item.`);
        }
      });
    }
    if (!Array.isArray(recipe.steps) || recipe.steps.length === 0
      || recipe.steps.some(step => typeof step !== 'string' || !step.trim())) {
      errors.push(`${label} must have at least one non-empty direction.`);
    }
  });

  return errors;
}

function readCatalog() {
  let recipes;
  try {
    recipes = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse recipies.json: ${error.message}`);
  }

  const errors = validateRecipes(recipes);
  if (errors.length) throw new Error(errors.join('\n'));
  return recipes;
}

function build(outputDirectory = path.join(ROOT, 'dist')) {
  readCatalog();
  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const filename of ['index.html', '404.html', 'recipies.json']) {
    fs.copyFileSync(path.join(ROOT, filename), path.join(outputDirectory, filename));
  }
}

function main(command) {
  if (command === 'validate') {
    const recipes = readCatalog();
    process.stdout.write(`Validated ${recipes.length} recipes.\n`);
    return;
  }
  if (command === 'build') {
    build();
    process.stdout.write('Built Cookbook site in dist/.\n');
    return;
  }
  throw new Error('Usage: node scripts/cookbook.js <validate|build>');
}

if (require.main === module) {
  try {
    main(process.argv[2]);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { build, validateRecipes };