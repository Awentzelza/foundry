/**
 * Foundry — push-time validation.
 *
 * Heuristic checks that catch the common mistakes Claude makes when generating
 * Foundry apps. Run BEFORE committing to GitHub so we don't burn a Vercel
 * build on a known-bad pattern.
 *
 * These aren't a substitute for tsc — they're a fast pre-flight. The actual
 * build runs after commit and the deploy poller catches anything that slips
 * through.
 */

import { transform } from 'sucrase';

export interface ValidationIssue {
  rule: string;
  message: string;
  hint?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  /** Non-blocking brand advisories. The push still proceeds. */
  warnings: ValidationIssue[];
}

const ALLOWED_IMPORTS = new Set([
  'react',
  '@ionic/react',
  'ionicons/icons',
  '@/hooks/useAppData',
  '@/types/app',
]);

const FORBIDDEN_JSX = ['<IonPage', '<IonContent', '<IonHeader'];

function extractImports(code: string): string[] {
  const re = /import[^'"]*?from\s+['"]([^'"]+)['"]/g;
  const sources: string[] = [];
  for (const m of code.matchAll(re)) sources.push(m[1]);
  return sources;
}

/** Strip comments and string literals so regex rules don't false-positive. */
function strip(code: string): string {
  // Remove block comments
  let out = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove line comments
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  // Remove string + template literals (best-effort)
  out = out
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '""')
    .replace(/"(?:\\[\s\S]|[^"\\])*"/g, '""')
    .replace(/'(?:\\[\s\S]|[^'\\])*'/g, "''");
  return out;
}

export function validatePushCode(code: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const stripped = strip(code);

  // --- Required ---
  if (!/\bexport\s+default\b/.test(stripped)) {
    issues.push({
      rule: 'missing-default-export',
      message: 'Component code must contain `export default` for the function component.',
      hint: 'Use `export default function MyApp() { ... }` at the top level.',
    });
  }

  // --- Allowed imports only ---
  const imports = extractImports(code);
  for (const src of imports) {
    if (!ALLOWED_IMPORTS.has(src)) {
      issues.push({
        rule: 'forbidden-import',
        message: `Import from "${src}" is not allowed.`,
        hint:
          'Allowed imports: ' +
          [...ALLOWED_IMPORTS].map((s) => `"${s}"`).join(', ') +
          '. If you need persistence, use `@/hooks/useAppData`.',
      });
    }
  }

  // --- useAppData destructure pattern ---
  // The hook returns an OBJECT, not a tuple. The most common mistake is
  // array-destructuring it like useState.
  if (/\]\s*=\s*useAppData\b/.test(stripped)) {
    issues.push({
      rule: 'useAppData-array-destructure',
      message: '`useAppData` returns an object, not a tuple. Do not array-destructure it.',
      hint:
        'Correct: `const { value, setValue, ready } = useAppData<T>(\'<id>\', \'<key>\', initial);` ' +
        'Wrong: `const [data, setData] = useAppData(...)`',
    });
  }

  // --- Forbidden JSX (shell provides these) ---
  for (const tag of FORBIDDEN_JSX) {
    if (stripped.includes(tag)) {
      issues.push({
        rule: 'forbidden-shell-jsx',
        message: `Do not render \`${tag.replace('<', '')}\` — the Foundry shell (AppHost) provides it.`,
        hint: 'Render your content directly. Wrap in a `<div>` if you need a container.',
      });
    }
  }

  // --- TS escape hatches ---
  if (/:\s*any\b/.test(stripped)) {
    issues.push({
      rule: 'no-any',
      message: 'Avoid `any`. Use concrete types.',
    });
  }
  if (/@ts-ignore|@ts-expect-error/.test(code)) {
    issues.push({
      rule: 'no-ts-suppression',
      message: 'Do not suppress TypeScript errors. Fix the underlying type problem.',
    });
  }

  // --- Browser storage APIs (PWA service worker conflicts + privacy) ---
  if (/\b(localStorage|sessionStorage)\b/.test(stripped)) {
    issues.push({
      rule: 'no-browser-storage',
      message:
        'Do not use localStorage or sessionStorage. Use `useAppData` for persistence so state syncs across devices.',
    });
  }

  // --- IonPage / IonContent / IonHeader IMPORTED (not just rendered) ---
  const ionicImport = code.match(/from\s+['"]@ionic\/react['"]/);
  if (ionicImport) {
    const imp = code.slice(0, ionicImport.index).match(/import\s+\{([^}]+)\}\s*$/);
    if (imp) {
      const named = imp[1]
        .split(',')
        .map((s) => s.trim().split(' as ')[0].trim())
        .filter(Boolean);
      for (const n of named) {
        if (n === 'IonPage' || n === 'IonContent' || n === 'IonHeader' || n === 'IonToolbar') {
          issues.push({
            rule: 'forbidden-ionic-shell-import',
            message: `Do not import \`${n}\` — the Foundry shell provides it.`,
          });
        }
      }
    }
  }

  // --- Real syntax + JSX check (sucrase transpile, Edge-safe pure JS) ---
  // The heuristics above catch known anti-patterns; this catches actual
  // TypeScript/JSX syntax errors (unbalanced tags, malformed expressions)
  // that would otherwise only surface during the Vercel build. sucrase does
  // not type-check, but it parses the full module and throws on any syntax
  // or JSX structural error, moving many remaining failures from build-time
  // to push-time at zero Vercel cost.
  try {
    transform(code, { transforms: ['typescript', 'jsx'], production: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push({
      rule: 'syntax-error',
      message: `Code failed to parse (TypeScript/JSX): ${message}`,
      hint: 'Fix the syntax/JSX error so the component parses as a valid .tsx module.',
    });
  }

  // --- Brand image check (Brand Book). Hard rules block; soft rules warn. ---
  const brand = validateBrand(code);
  for (const issue of brand.issues) issues.push(issue);

  return { ok: issues.length === 0, issues, warnings: brand.warnings };
}


/**
 * Foundry brand image check (Brand Book).
 *
 * HARD rules (block the push): no emoji; no off-palette hex colours; brand
 * fonts only; no exclamation points in copy. SOFT rules (warn, non-blocking):
 * gradients, glow/shadow, continuous animation.
 */
const PALETTE_HEX = new Set<string>([
  '#111010', '#1a1815', '#211f1b', '#2e2b27', '#3d3a34',
  '#f0ede8', '#a09b93', '#6b6560',
  '#e8742c', '#f08540', '#c45a18', '#c8a45a', '#2a1a10',
]);

function stringLiteralContents(code: string): string[] {
  const out: string[] = [];
  const patterns = [/'(?:\\.|[^'\\])*'/g, /"(?:\\.|[^"\\])*"/g, /`(?:\\.|[^`\\])*`/g];
  for (const re of patterns) {
    for (const m of code.matchAll(re)) out.push(m[0].slice(1, -1));
  }
  return out;
}

export function validateBrand(code: string): {
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // HARD — no emoji.
  if (/\p{Extended_Pictographic}/u.test(code)) {
    issues.push({
      rule: 'brand-no-emoji',
      message: 'No emoji. Foundry uses typographic marks and the signet, never emoji.',
      hint: 'Remove the emoji; use a hallmark label or a Fraunces letterform instead.',
    });
  }

  // HARD — off-palette hex colours.
  const badHex = new Set<string>();
  for (const m of code.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    if (!PALETTE_HEX.has(m[0].toLowerCase())) badHex.add(m[0]);
  }
  if (badHex.size > 0) {
    issues.push({
      rule: 'brand-off-palette-color',
      message: `Off-palette colour(s): ${[...badHex].join(', ')}.`,
      hint:
        'Use a var(--foundry-*) token (var(--foundry-bg|card|elevated|border|' +
        'text|text-muted|text-subtle|ember)). Ember is the only accent; ' +
        'Mark Gold is reserved for the signet.',
    });
  }

  // HARD — brand fonts only.
  for (const m of code.matchAll(/font-?[fF]amily\s*:\s*(['"`])([^'"`]*)\1/g)) {
    const val = m[2];
    const ok =
      /var\(--foundry-font/.test(val) ||
      /Fraunces|JetBrains Mono|EB Garamond/.test(val);
    if (!ok) {
      issues.push({
        rule: 'brand-font',
        message: `Non-brand font-family: "${val}".`,
        hint: 'Use var(--foundry-font-display), var(--foundry-font-mono), or var(--foundry-font-body).',
      });
    }
  }

  // HARD — no exclamation points in user-facing copy.
  for (const lit of stringLiteralContents(code)) {
    if (lit.includes('!') && !/var\(|import|https?:|<svg|xmlns|!important/i.test(lit)) {
      issues.push({
        rule: 'brand-no-exclamation',
        message: `Exclamation point in copy: "${lit.trim().slice(0, 48)}".`,
        hint: 'Foundry speaks as a steward — state facts, no exclamation points.',
      });
      break;
    }
  }

  // SOFT — gradients, glow, continuous animation.
  if (/(?:linear|radial)-gradient\s*\(/.test(code)) {
    warnings.push({
      rule: 'brand-no-gradient',
      message: 'Gradients are off-brand — Foundry surfaces are flat.',
    });
  }
  if (/box-?[sS]hadow\s*:/.test(code)) {
    warnings.push({
      rule: 'brand-no-glow',
      message: 'Avoid box-shadow / glow. Use a hairline border instead.',
    });
  }
  if (/@keyframes|animation\s*:/.test(code)) {
    warnings.push({
      rule: 'brand-stillness',
      message: 'Surfaces and the mark stay still — avoid continuous animation.',
    });
  }

  return { issues, warnings };
}
