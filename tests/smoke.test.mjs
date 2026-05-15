import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function parseConstString(source, name) {
  const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*['\"]([^'\"]+)['\"]`));
  assert.ok(match, `Could not find exported const ${name}`);

  return match[1];
}

function parseConstStringArray(source, name) {
  const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\[([^\\]]+)\\]`));
  assert.ok(match, `Could not find exported array const ${name}`);

  const values = [...match[1].matchAll(/['\"]([^'\"]+)['\"]/g)].map(([, value]) => value);
  assert.ok(values.length > 0, `${name} should contain at least one value`);

  return values;
}

function getConfiguredI18n() {
  const siteConfig = readText('src/config/site.ts');

  return {
    defaultLocale: parseConstString(siteConfig, 'defaultLocale'),
    locales: parseConstStringArray(siteConfig, 'locales'),
  };
}

describe('project smoke checks', () => {
  it('has the minimum files needed by Astro', () => {
    [
      'package.json',
      'astro.config.mjs',
      'src/pages/index.astro',
      'src/pages/[locale]/index.astro',
      'src/pages/display/index.astro',
      'src/pages/404.astro',
      'src/pages/manifest.webmanifest.ts',
      'src/pages/robots.txt.ts',
      'src/layouts/BaseLayout.astro',
      'src/config/site.ts',
      'src/i18n/ui.ts',
      'src/i18n/translations',
      'src/utils/paths.ts',
      'src/styles/global.css',
    ].forEach((path) => {
      assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
    });
  });

  it('keeps template metadata files available', () => {
    ['.nvmrc', '.env.example', '.gitignore', '.prettierrc', '.prettierignore', 'README.md'].forEach(
      (path) => {
        assert.equal(existsSync(join(root, path)), true, `${path} should exist`);
      }
    );
  });

  it('keeps the expected npm scripts available', () => {
    const pkg = readJson('package.json');

    assert.equal(pkg.scripts?.dev, 'astro dev');
    assert.equal(pkg.scripts?.build, 'astro build');
    assert.equal(pkg.scripts?.preview, 'astro preview');
    assert.ok(pkg.scripts?.test?.includes('node --test'));
    assert.ok(pkg.scripts?.clean?.includes('scripts/clean.mjs'));
  });

  it('keeps basic template components available', () => {
    ['Button', 'Container', 'Footer', 'Header', 'PosterBuilder', 'PosterViewer'].forEach((component) => {
      assert.equal(
        existsSync(join(root, `src/components/${component}.astro`)),
        true,
        `${component}.astro should exist`
      );
    });
  });

  it('keeps Astro i18n enabled and aligned with site config', () => {
    const astroConfig = readText('astro.config.mjs');
    const readme = readText('README.md');
    const { defaultLocale, locales } = getConfiguredI18n();

    assert.match(astroConfig, /i18n/);
    assert.match(astroConfig, new RegExp(`defaultLocale:\\s*['\"]${defaultLocale}['\"]`));

    locales.forEach((locale) => {
      assert.match(
        astroConfig,
        new RegExp(`['\"]${locale}['\"]`),
        `${locale} should be configured in Astro i18n locales`
      );
      assert.equal(
        existsSync(join(root, `src/i18n/translations/${locale}.json`)),
        true,
        `${locale}.json should exist`
      );
    });

    assert.match(readme, /Documentación para agentes IA/);
    assert.match(readme, /src\/i18n\/translations|i18n/);
  });

  it('keeps translation files aligned with configured locales', () => {
    const { defaultLocale, locales } = getConfiguredI18n();
    const defaultTranslations = readJson(`src/i18n/translations/${defaultLocale}.json`);
    const expectedKeys = Object.keys(defaultTranslations).sort();
    const translationFiles = readdirSync(join(root, 'src/i18n/translations'))
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''));

    assert.deepEqual(
      [...translationFiles].sort(),
      [...locales].sort(),
      'translation JSON files should match configured locales'
    );

    locales.forEach((locale) => {
      const translations = readJson(`src/i18n/translations/${locale}.json`);
      assert.deepEqual(
        Object.keys(translations).sort(),
        expectedKeys,
        `${locale}.json keys should match ${defaultLocale}.json`
      );
      assert.ok(translations['home.title'], `${locale}.json should include home.title`);
      assert.ok(translations['nav.main'], `${locale}.json should include nav.main`);
    });
  });

  it('keeps routing and assets compatible with root and subpath deployments', () => {
    const layout = readText('src/layouts/BaseLayout.astro');
    const manifest = readText('src/pages/manifest.webmanifest.ts');
    const robots = readText('src/pages/robots.txt.ts');
    const i18nHelper = readText('src/i18n/ui.ts');
    const pathHelpers = readText('src/utils/paths.ts');

    [layout, manifest, robots, i18nHelper].forEach((source) => {
      assert.match(source, /withBasePath|getLocalizedPath|stripBasePath/);
      assert.doesNotMatch(source, /href=\"\//);
      assert.doesNotMatch(source, /src=\"\//);
    });

    assert.match(pathHelpers, /withBasePath/);
    assert.match(pathHelpers, /stripBasePath/);
    assert.match(pathHelpers, /getAbsoluteUrl/);
    assert.match(manifest, /start_url/);
    assert.match(robots, /sitemap-index\.xml/);
  });

  it('includes the digital signage builder, viewer and widgets', () => {
    const builder = readText('src/components/PosterBuilder.astro');
    const viewer = readText('src/components/PosterViewer.astro');
    const runtime = readText('src/scripts/poster-runtime.js');
    const data = readText('src/data/widgetTypes.ts');
    const styles = readText('src/styles/global.css');

    ['text', 'qr', 'datetime', 'image', 'weather', 'forecast'].forEach((type) => {
      assert.match(data, new RegExp(`['\"]${type}['\"]`));
    });

    assert.match(builder, /data-poster-builder/);
    assert.match(viewer, /data-poster-viewer/);
    assert.match(runtime, /localStorage/);
    assert.match(runtime, /encodePosterConfig/);
    assert.match(runtime, /decodePosterConfig/);
    assert.match(runtime, /Open-Meteo|open-meteo/);
    assert.match(runtime, /qrserver/);
    assert.match(styles, /poster-screen-full/);
  });

  it('uses an external icon pack for the insert toolbar layout', () => {
    const pkg = readJson('package.json');
    const builder = readText('src/components/PosterBuilder.astro');
    const styles = readText('src/styles/global.css');

    assert.ok(pkg.dependencies?.['@iconify-json/lucide']);
    assert.match(builder, /astro-icon\/components/);
    assert.match(builder, /widget-toolbar/);
    assert.match(builder, /lucide:qr-code/);
    assert.match(builder, /poster-layout/);
    assert.match(builder, /poster-editor-main/);
    assert.match(builder, /page-panel/);
    assert.match(styles, /widget-toolbar/);
    assert.match(styles, /poster-editor-main/);
    assert.match(styles, /page-panel/);
  });

  it('uses OpenWeather icons in weather widgets', () => {
    const runtime = readText('src/scripts/poster-runtime.js');
    const styles = readText('src/styles/global.css');

    assert.match(runtime, /openweathermap\.org\/img\/wn/);
    assert.match(runtime, /WEATHER_ICON_CODES/);
    assert.match(runtime, /weatherIconHtml/);
    assert.match(runtime, /is_day/);
    assert.match(styles, /weather-icon/);
    assert.match(styles, /weather-current/);
  });

  it('keeps visual editor interactions usable', () => {
    const runtime = readText('src/scripts/poster-runtime.js');
    const styles = readText('src/styles/global.css');

    assert.match(runtime, /contentEditable = 'true'/);
    assert.match(runtime, /dataInlineText|data-inline-text/);
    assert.match(runtime, /setPointerCapture/);
    assert.match(runtime, /releasePointerCapture/);
    assert.match(runtime, /closest\('\.poster-widget'\)/);
    assert.match(runtime, /!\['municipality', 'url', 'imageUrl'\]\.includes\(key\)/);
    assert.match(styles, /poster-editable-text/);
    assert.match(styles, /widget-resize/);
  });

  it('keeps starter links and labels configurable or translated', () => {
    const siteConfig = readText('src/config/site.ts');
    const header = readText('src/components/Header.astro');
    const home = readText('src/pages/index.astro');
    const localizedHome = readText('src/pages/[locale]/index.astro');
    const envExample = readText('.env.example');

    assert.match(siteConfig, /repositoryUrl/);
    assert.match(envExample, /PUBLIC_REPOSITORY_URL/);
    assert.match(header, /t\('nav\.main'\)/);
    assert.match(home, /PosterBuilder/);
    assert.match(localizedHome, /PosterBuilder/);
    assert.doesNotMatch(home, /https:\/\/github\.com\/jalonsomerchan\/astro-template/);
    assert.doesNotMatch(localizedHome, /https:\/\/github\.com\/jalonsomerchan\/astro-template/);
  });

  it('includes GitHub workflows for CI and Pages', () => {
    const pagesWorkflow = readText('.github/workflows/pages.yml');
    const ciWorkflow = readText('.github/workflows/ci.yml');

    assert.match(pagesWorkflow, /actions\/deploy-pages@v4/);
    assert.match(pagesWorkflow, /npm run build/);
    assert.match(pagesWorkflow, /npm test/);
    assert.match(ciWorkflow, /pull_request/);
    assert.match(ciWorkflow, /npm run build/);
    assert.match(ciWorkflow, /npm test/);
  });

  it('keeps useful project documentation available', () => {
    const readme = readText('README.md');

    assert.match(readme, /Digital Poster/);
    assert.match(readme, /localStorage/);
    assert.match(readme, /Exportación e importación/);
    assert.equal(existsSync(join(root, 'agents.md')), true, 'agents.md should exist');
    assert.equal(existsSync(join(root, 'docs/design-system.md')), true, 'docs/design-system.md should exist');
  });
});
