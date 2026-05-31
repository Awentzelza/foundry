/**
 * Shared helpers for Foundry edge functions.
 * Vercel edge runtime: Web Fetch API + crypto.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  FOUNDRY_PUSH_SECRET: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_DEFAULT_BRANCH?: string;
}

export function env(): Env {
  // Both VITE_SUPABASE_URL and SUPABASE_URL are accepted so we don't force
  // duplicate env vars in Vercel.
  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const FOUNDRY_PUSH_SECRET = process.env.FOUNDRY_PUSH_SECRET || '';
  return {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    FOUNDRY_PUSH_SECRET,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER || 'Awentzelza',
    GITHUB_REPO: process.env.GITHUB_REPO || 'foundry',
    GITHUB_DEFAULT_BRANCH: process.env.GITHUB_DEFAULT_BRANCH || 'main',
  };
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export function requireAuth(req: Request, e: Env): Response | null {
  if (!e.FOUNDRY_PUSH_SECRET) {
    return json({ error: 'FOUNDRY_PUSH_SECRET not configured' }, { status: 500 });
  }
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (token !== e.FOUNDRY_PUSH_SECRET) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export function sb(e: Env): SupabaseClient | null {
  if (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Slug validator — lowercase, hyphenated, 2..40 chars. */
export function isValidId(id: string): boolean {
  return /^[a-z][a-z0-9-]{1,39}$/.test(id);
}

/**
 * Commits a file to GitHub via the contents API. Creates the file if
 * absent, updates if present. Returns the commit SHA.
 *
 * Path is relative to repo root (e.g. `src/apps/meal-plan/index.tsx`).
 */
export async function commitFileToGitHub(
  e: Env,
  args: { path: string; content: string; message: string },
): Promise<{ ok: true; sha: string } | { ok: false; error: string; status: number }> {
  if (!e.GITHUB_TOKEN || !e.GITHUB_OWNER || !e.GITHUB_REPO) {
    return { ok: false, error: 'GitHub env not configured', status: 500 };
  }
  const branch = e.GITHUB_DEFAULT_BRANCH || 'main';
  const url = `https://api.github.com/repos/${e.GITHUB_OWNER}/${e.GITHUB_REPO}/contents/${encodeURI(args.path)}`;

  // Look up the existing SHA (needed for update).
  let existingSha: string | undefined;
  const head = await fetch(`${url}?ref=${branch}`, {
    headers: {
      authorization: `Bearer ${e.GITHUB_TOKEN}`,
      'user-agent': 'foundry-push',
      accept: 'application/vnd.github+json',
    },
  });
  if (head.ok) {
    const j = (await head.json()) as { sha?: string };
    existingSha = j.sha;
  }

  const body = {
    message: args.message,
    content: btoa(unescape(encodeURIComponent(args.content))),
    branch,
    sha: existingSha,
  };

  const put = await fetch(url, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${e.GITHUB_TOKEN}`,
      'user-agent': 'foundry-push',
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!put.ok) {
    const text = await put.text();
    return { ok: false, error: `GitHub error: ${put.status} ${text}`, status: 502 };
  }
  const j = (await put.json()) as { commit?: { sha?: string } };
  return { ok: true, sha: j.commit?.sha ?? '' };
}
