import fs from 'node:fs';
import path from 'node:path';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ExtensionPage from './ExtensionPage.vue';
import PrivacyPage from './PrivacyPage.vue';
import SupportPage from './SupportPage.vue';

const frontendRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(frontendRoot, '..');
const stylesCss = readProjectFile('frontend/src/styles.css');
const designSystem = readProjectFile('DESIGN.md');
const publicPageSources = [
  ['frontend/src/pages/ExtensionPage.vue', readProjectFile('frontend/src/pages/ExtensionPage.vue')],
  ['frontend/src/pages/PrivacyPage.vue', readProjectFile('frontend/src/pages/PrivacyPage.vue')],
  ['frontend/src/pages/SupportPage.vue', readProjectFile('frontend/src/pages/SupportPage.vue')],
  ['frontend/src/pages/ExtensionConnectPage.vue', readProjectFile('frontend/src/pages/ExtensionConnectPage.vue')]
];

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function extractScopedStyle(source) {
  return source.match(/<style scoped>([\s\S]*?)<\/style>/)?.[1] ?? '';
}

function parseDeclarations(css) {
  const declarations = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const rule of css.matchAll(rulePattern)) {
    const selector = rule[1].trim().replace(/\s+/g, ' ');
    for (const declaration of rule[2].split(';')) {
      const [rawProperty, ...rawValueParts] = declaration.split(':');
      const property = rawProperty?.trim();
      const value = rawValueParts.join(':').trim();
      if (property && value) {
        declarations.push({ selector, property, value });
      }
    }
  }
  return declarations;
}

function declarationsFor(css, selectorPart) {
  return parseDeclarations(css).filter(({ selector }) => selector.includes(selectorPart));
}

function declarationMap(css, selectorPart) {
  return Object.fromEntries(declarationsFor(css, selectorPart).map(({ property, value }) => [property, value]));
}

function hexValues(source) {
  return [...source.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(([value]) => value.toLowerCase());
}

function designHexValues() {
  return new Set(hexValues(designSystem));
}

function mountPublicPage(component) {
  return mount(component, {
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>'
        }
      }
    }
  });
}

describe('ProductionVisualPolish', () => {
  it('TC-EXT-004: exposes the Korean-friendly production font stack through the global body rule', () => {
    const rootTokens = declarationMap(stylesCss, ':root');
    const bodyRule = declarationMap(stylesCss, 'body');

    expect(rootTokens['--font-sans']).toContain('"Noto Sans KR"');
    expect(rootTokens['--font-sans']).toContain('"Apple SD Gothic Neo"');
    expect(rootTokens['--font-sans']).toContain('"Malgun Gothic"');
    expect(bodyRule['font-family']).toBe('var(--font-sans)');
    expect(bodyRule['word-break']).toBe('keep-all');
  });

  it('TC-EXT-004: avoids negative letter spacing in production and public styles', () => {
    const checkedStyles = [
      ['frontend/src/styles.css', stylesCss],
      ...publicPageSources.map(([fileName, source]) => [fileName, extractScopedStyle(source)])
    ];
    const offenders = checkedStyles.flatMap(([fileName, css]) => {
      return parseDeclarations(css)
        .filter(({ property, value }) => property === 'letter-spacing' && value.startsWith('-'))
        .map(({ selector, value }) => `${fileName}: ${selector} -> ${value}`);
    });

    expect(offenders).toEqual([]);
  });

  it('TC-EXT-004: public page raw hex values are declared as design tokens', () => {
    const documentedHexValues = designHexValues();
    const rootTokenHexValues = parseDeclarations(stylesCss)
      .filter(({ selector, property }) => selector === ':root' && property.startsWith('--'))
      .flatMap(({ value }) => hexValues(value));
    const globalTokenDeclarations = rootTokenHexValues.map((value) => ({
      fileName: 'frontend/src/styles.css',
      value
    }));
    const publicHexValues = publicPageSources.flatMap(([fileName, source]) => {
      return hexValues(extractScopedStyle(source)).map((value) => ({ fileName, value }));
    });

    expect([...documentedHexValues]).toEqual(expect.arrayContaining(rootTokenHexValues));
    expect([...globalTokenDeclarations, ...publicHexValues].filter(({ value }) => !documentedHexValues.has(value))).toEqual([]);
  });

  it('TC-EXT-004/SUPPORT-001: public pages render the production shell semantics', () => {
    for (const component of [ExtensionPage, PrivacyPage, SupportPage]) {
      const wrapper = mountPublicPage(component);

      expect(wrapper.get('main').classes()).toContain('public-page-shell');
      expect(wrapper.get('nav.public-topbar').attributes('aria-label')).toBeTruthy();
      expect(wrapper.findAll('h1')).toHaveLength(1);
      expect(wrapper.get('h1').attributes('id')).toBeTruthy();
    }

    expect(mountPublicPage(ExtensionPage).find('.public-section.public-grid').exists()).toBe(true);
    expect(mountPublicPage(PrivacyPage).find('article.public-paper.public-section').exists()).toBe(true);
    expect(mountPublicPage(SupportPage).find('.faq-list.public-section').exists()).toBe(true);
  });

  it('TC-EXT-004: CTA and button text can wrap safely on mobile-facing controls', () => {
    const sharedButtonRule = declarationMap(stylesCss, '.primary-button, .ghost-button, .text-button');
    const extensionPrimaryLink = declarationMap(extractScopedStyle(publicPageSources[0][1]), '.public-primary-link, .public-secondary-link');

    expect(sharedButtonRule['white-space']).toBe('normal');
    expect(sharedButtonRule['overflow-wrap']).toBe('anywhere');
    expect(sharedButtonRule['min-width']).toBe('0');
    expect(extensionPrimaryLink['white-space']).toBe('normal');
    expect(extensionPrimaryLink['overflow-wrap']).toBe('anywhere');
    expect(mountPublicPage(ExtensionPage).find('.public-actions.public-cta-row').exists()).toBe(true);
  });
});
