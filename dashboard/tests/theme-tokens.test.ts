// Keeps the dashboard tokens (dashboard/app/theme.css) identical to the
// mobile theme, which is where contrast is checked. Run with
// `pnpm test:dashboard`.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { colors, type ColorScheme } from '../../mobile/theme/colors.ts';
import { shadows } from '../../mobile/theme/shadows.ts';
import { radius, sizes } from '../../mobile/theme/spacing.ts';

const css = readFileSync(new URL('../app/theme.css', import.meta.url), 'utf8');

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function normalize(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

// The first `:root` block holds the light values; the one inside the
// prefers-color-scheme media query holds the dark ones.
function block(scheme: ColorScheme): Map<string, string> {
  const start =
    scheme === 'light' ? css.indexOf(':root {') : css.indexOf(':root {', css.indexOf('@media'));
  assert.ok(start >= 0, `no :root block for ${scheme}`);
  const body = css.slice(start, css.indexOf('}', start));
  const vars = new Map<string, string>();
  for (const match of body.matchAll(/--sp-([\w-]+):\s*([^;]+);/g)) {
    vars.set(match[1], normalize(match[2]));
  }
  return vars;
}

describe('dashboard theme tokens', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it(`matches the mobile ${scheme} colours`, () => {
      const vars = block(scheme);
      for (const [key, value] of Object.entries(colors[scheme])) {
        // `shadow` is the React Native shadow colour; the web uses the
        // box-shadow strings below instead.
        if (key === 'shadow') continue;
        assert.equal(vars.get(kebab(key)), normalize(value), `${scheme} ${key}`);
      }
    });

    it(`matches the mobile ${scheme} shadows`, () => {
      const vars = block(scheme);
      for (const [level, value] of Object.entries(shadows[scheme])) {
        if (level === 'none') continue;
        assert.equal(vars.get(`shadow-${level}`), normalize(value ?? 'none'), `${scheme} ${level}`);
      }
    });
  }

  it('matches the mobile radii and screen gutter', () => {
    for (const [name, value] of Object.entries(radius)) {
      assert.match(css, new RegExp(`--radius-${name}:\\s*${value}px;`), `radius ${name}`);
    }
    assert.match(css, new RegExp(`--spacing-gutter:\\s*${sizes.screenGutter}px;`));
  });
});
