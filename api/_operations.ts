/**
 * Foundry — shared operations.
 *
 * REST endpoints (/api/push-app, /api/archive-app) and the MCP server
 * (/api/mcp) both call into these functions. One source of truth for
 * what it means to "push an app" or "archive an app."
 */
import { commitFileToGitHub, type Env, isValidId, sb } from './_lib';

export interface PushAppInput {
  id: string;
  name: string;
  description?: string;
  icon: string;
  route?: string;
  componentCode: string;
  needsPersistence?: boolean;
}

export interface PushAppResult {
  success: true;
  id: string;
  route: string;
  commit: { sha?: string; skipped?: string };
  supabase: { ok: true } | { error: string };
}

export interface OperationError {
  success: false;
  status: number;
  error: string;
}

export type AppRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  route: string;
  needs_persistence: boolean | null;
  status: 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
};

function validatePushInput(input: PushAppInput): OperationError | null {
  if (!input.id || !isValidId(input.id)) {
    return {
      success: false,
      status: 400,
      error: 'Invalid `id` (lowercase, hyphenated, 2-40 chars, starts with a letter).',
    };
  }
  if (!input.name || !input.icon || !input.componentCode) {
    return {
      success: false,
      status: 400,
      error: 'Missing required fields: name, icon, componentCode.',
    };
  }
  if (!/export\s+default/.test(input.componentCode)) {
    return {
      success: false,
      status: 400,
      error: 'componentCode must contain `export default` for the component.',
    };
  }
  return null;
}

export async function pushApp(
  input: PushAppInput,
  env: Env,
): Promise<PushAppResult | OperationError> {
  const validationError = validatePushInput(input);
  if (validationError) return validationError;

  const { id, name, description = '', icon, componentCode, needsPersistence = false } = input;
  const route = input.route ?? id;

  const client = sb(env);
  const upsert = client
    ? await client.from('foundry_apps').upsert(
        {
          id,
          name,
          description,
          icon,
          route,
          needs_persistence: needsPersistence,
          status: 'active',
        },
        { onConflict: 'id' },
      )
    : { error: { message: 'Supabase not configured' } };

  let commit: { sha?: string; skipped?: string } = {};
  if (env.GITHUB_TOKEN) {
    const filePath = `src/apps/${id}/index.tsx`;
    const file = await commitFileToGitHub(env, {
      path: filePath,
      content: componentCode,
      message: `Foundry: push app ${id}`,
    });
    if (!file.ok) {
      return { success: false, status: file.status, error: file.error };
    }
    commit = { sha: file.sha };

    const regen = await regenerateRegistry(env);
    if (!regen.ok) commit = { ...commit, skipped: regen.error };
  } else {
    commit = { skipped: 'GITHUB_TOKEN not set; only metadata persisted to Supabase' };
  }

  return {
    success: true,
    id,
    route: `/app/${route}`,
    commit,
    supabase: upsert.error ? { error: upsert.error.message } : { ok: true },
  };
}

export async function archiveApp(
  id: string,
  env: Env,
): Promise<{ success: true; id: string; status: 'archived' } | OperationError> {
  if (!isValidId(id)) {
    return { success: false, status: 400, error: 'Invalid `id`.' };
  }
  const client = sb(env);
  if (!client) {
    return { success: false, status: 500, error: 'Supabase not configured.' };
  }
  const { error } = await client
    .from('foundry_apps')
    .update({ status: 'archived' })
    .eq('id', id);
  if (error) {
    return { success: false, status: 500, error: error.message };
  }
  return { success: true, id, status: 'archived' };
}

export interface ListAppsOptions {
  includeArchived?: boolean;
}

export async function listApps(
  options: ListAppsOptions,
  env: Env,
): Promise<{ success: true; apps: AppRow[] } | OperationError> {
  const client = sb(env);
  if (!client) {
    return { success: false, status: 500, error: 'Supabase not configured.' };
  }
  const query = client
    .from('foundry_apps')
    .select('id,name,description,icon,route,needs_persistence,status,created_at,updated_at')
    .order('id');
  const { data, error } = options.includeArchived
    ? await query
    : await query.eq('status', 'active');
  if (error || !data) {
    return { success: false, status: 500, error: error?.message ?? 'list failed' };
  }
  return { success: true, apps: data as AppRow[] };
}

export async function getApp(
  id: string,
  env: Env,
): Promise<{ success: true; app: AppRow } | OperationError> {
  if (!isValidId(id)) {
    return { success: false, status: 400, error: 'Invalid `id`.' };
  }
  const client = sb(env);
  if (!client) {
    return { success: false, status: 500, error: 'Supabase not configured.' };
  }
  const { data, error } = await client
    .from('foundry_apps')
    .select('id,name,description,icon,route,needs_persistence,status,created_at,updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) return { success: false, status: 500, error: error.message };
  if (!data) return { success: false, status: 404, error: `App "${id}" not found.` };
  return { success: true, app: data as AppRow };
}

async function regenerateRegistry(
  env: Env,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = sb(env);
  if (!client) return { ok: false, error: 'Supabase not configured' };
  const { data, error } = await client
    .from('foundry_apps')
    .select('id,name,description,icon,route,needs_persistence,status')
    .order('id');
  if (error || !data) return { ok: false, error: error?.message || 'registry read failed' };

  const lines: string[] = [];
  lines.push('// AUTO-GENERATED by /api/push-app and /api/mcp. Edit src/apps/<slug>/index.tsx, not this file.');
  lines.push("import type { RegisteredApp } from '@/types/app';");
  lines.push('');
  lines.push('export const APP_REGISTRY: RegisteredApp[] = [');
  for (const row of data as AppRow[]) {
    lines.push('  {');
    lines.push('    meta: {');
    lines.push(`      id: ${JSON.stringify(row.id)},`);
    lines.push(`      name: ${JSON.stringify(row.name)},`);
    lines.push(`      description: ${JSON.stringify(row.description ?? '')},`);
    lines.push(`      icon: ${JSON.stringify(row.icon)},`);
    lines.push(`      route: ${JSON.stringify(row.route)},`);
    lines.push(`      needsPersistence: ${row.needs_persistence ? 'true' : 'false'},`);
    lines.push(`      status: ${JSON.stringify(row.status)},`);
    lines.push('    },');
    lines.push(`    load: () => import(${JSON.stringify(`./${row.id}`)}),`);
    lines.push('  },');
  }
  lines.push('];');
  lines.push('');
  lines.push('export function findApp(id: string): RegisteredApp | undefined {');
  lines.push('  return APP_REGISTRY.find((a) => a.meta.id === id);');
  lines.push('}');
  lines.push('');

  const result = await commitFileToGitHub(env, {
    path: 'src/apps/registry.ts',
    content: lines.join('\n'),
    message: 'Foundry: regenerate app registry',
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
