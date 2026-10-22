# HouseLearning Cookbook

The Cookbook is a static recipe catalog backed by `recipies.json`. The filename is retained for compatibility with the published page.

## Local checks

Run `npm test` for catalog validation tests, `npm run validate` to check the live catalog, and `npm run build` to create a deployable `dist/` directory.

Validation checks unique recipe IDs, titles, serving counts, preparation times, tags, ingredients, and directions. The build validates the catalog before copying the site page and data into `dist/`.

## Deployment

Pull requests run the tests, validation, and build. Pushes to `main` deploy the validated `dist/` artifact to GitHub Pages. Enable GitHub Pages with **GitHub Actions** as the build and deployment source in repository settings.