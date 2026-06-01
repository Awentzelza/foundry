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

export interface ValidationIssue {
  rule: string;
  message: string;
  hint?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
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

  return { ok: issues.length === 0, issues };
}
