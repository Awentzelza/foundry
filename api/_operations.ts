/**
 * Foundry — shared operations.
 *
 * REST endpoints (/api/push-app, /api/archive-app) and the MCP server
 * (/api/mcp) both call into these functions. One source of truth for
 * what it means to "push an app" or "archive an app."
 */
import { commitFileToGitHub, getFileFromGitHub, type Env, isValidId, sb } from './_lib';
import { validatePushCode, validateBrandStyles, type ValidationIssue } from './_validate';
import {
  checkDeployByUid,
  checkDeployStatus,
  discoverDeployment,
  waitForDeploy,
  type DeployVerdict,
} from './_vercel';

export { checkDeployStatus, checkDeployByUid };

export interface PushAppInput {
  id: string;
  name: string;
  description?: string;
  icon: string;
  route?: string;
  componentCode: string;
  /**
   * Optional per-app CSS module. Committed to src/apps/<id>/styles.module.css.
   * The component imports it (`import s from './styles.module.css'`) and uses
   * the hashed class names. Scanned by the brand check before commit.
   */
  styles?: string;
  needsPersistence?: boolean;
  /**
   * Default false: return immediately after the commit with the deploymentUid
   * to poll (the build runs async on Vercel). Pass true to block on the build
   * verdict within the Edge budget and auto-archive on a build failure — note
   * real builds often exceed that budget and come back as `building`.
   */
  waitForDeploy?: boolean;
}

export interface PushAppResult {
  success: true;
  id: string;
  route: string;
  commit: { sha?: string; skipped?: string };
  supabase: { ok: true } | { error: string };
  deploy?: DeployVerdict;
  /** Non-blocking brand advisories from the pre-flight check. */
  warnings?: ValidationIssue[];
}

export interface PushAppValidationError {
  success: false;
  status: 400;
  error: string;
  issues: ValidationIssue[];
  warnings?: ValidationIssue[];
  phase: 'validation';
}

export interface PushAppBuildError {
  success: false;
  status: 422;
  error: string;
  phase: 'build';
  commit: { sha?: string };
  deployErrorLog?: string;
  deploymentUid?: string;
}

export interface PushAppMetadataError {
  success: false;
  status: 502;
  error: string;
  phase: 'metadata';
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

function validateMetadata(input: PushAppInput): OperationError | null {
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
  return null;
}

export async function pushApp(
  input: PushAppInput,
  env: Env,
): Promise<
  | PushAppResult
  | OperationError
  | PushAppValidationError
  | PushAppBuildError
  | PushAppMetadataError
> {
  // --- Phase 1: metadata + heuristic code validation (instant) ---
  const metaError = validateMetadata(input);
  if (metaError) return metaError;

  const codeCheck = validatePushCode(input.componentCode);
  if (!codeCheck.ok) {
    return {
      success: false,
      status: 400,
      phase: 'validation',
      error:
        `componentCode failed ${codeCheck.issues.length} pre-flight check(s). ` +
        'Fix the issues below and retry. No commit was made.',
      issues: codeCheck.issues,
      warnings: codeCheck.warnings.length ? codeCheck.warnings : undefined,
    };
  }

  // Per-app stylesheet brand check (consume tokens, never redefine them).
  const styleCheck =
    input.styles && input.styles.trim()
      ? validateBrandStyles(input.styles)
      : { issues: [], warnings: [] };
  if (styleCheck.issues.length) {
    return {
      success: false,
      status: 400,
      phase: 'validation',
      error:
        `styles failed ${styleCheck.issues.length} brand check(s). ` +
        'Fix the issues below and retry. No commit was made.',
      issues: styleCheck.issues,
      warnings: styleCheck.warnings.length ? styleCheck.warnings : undefined,
    };
  }

  const { id, name, description = '', icon, componentCode, needsPersistence = false } = input;
  const route = input.route ?? id;
  const shouldWait = input.waitForDeploy === true;

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

  // If Supabase IS configured but the metadata upsert failed (RLS, network, or
  // db error), stop before committing. Committing the component without an
  // active metadata row yields a deployed-but-invisible app and a misleading
  // success. Fail loud so the caller can fix and retry. (A null client — i.e.
  // Supabase not configured, local dev — falls through as before.)
  if (client && upsert.error) {
    return {
      success: false,
      status: 502,
      phase: 'metadata',
      error:
        `Failed to persist app metadata for "${id}" to Supabase: ${upsert.error.message}. ` +
        'No commit was made. Resolve the cause and call push_app again.',
    };
  }

  // --- Phase 2: commit to GitHub ---
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

    if (input.styles && input.styles.trim()) {
      const styleFile = await commitFileToGitHub(env, {
        path: `src/apps/${id}/styles.module.css`,
        content: input.styles,
        message: `Foundry: push styles for ${id}`,
      });
      if (!styleFile.ok) {
        return { success: false, status: styleFile.status, error: styleFile.error };
      }
      commit = { sha: styleFile.sha };
    }

    const regen = await regenerateRegistry(env);
    if (!regen.ok) commit = { ...commit, skipped: regen.error };
  } else {
    commit = { skipped: 'GITHUB_TOKEN not set; only metadata persisted to Supabase' };
  }

  // --- Phase 3: deploy verdict ---
  // Default is fire-and-forget: the Edge budget (~25s) can't outlast a 30-90s
  // build, so we return the deploymentUid immediately and let the caller poll
  // get_deploy_status / verify_deploy. A failed build never goes live (the
  // previous successful build keeps serving), so there is no broken tile to
  // auto-archive in this mode. Pass waitForDeploy: true to block and have a
  // build failure auto-archived inline.
  let deploy: DeployVerdict | undefined;
  if (commit.sha && !shouldWait) {
    deploy = await discoverDeployment(env, commit.sha);
  }
  if (shouldWait && commit.sha) {
    deploy = await waitForDeploy(env, commit.sha);

    if (deploy.status === 'error') {
      // Build broke. Auto-archive so the dashboard isn't pointing at a broken
      // tile that never builds. The component file stays in the repo for diff.
      if (client) {
        await client
          .from('foundry_apps')
          .update({ status: 'archived' })
          .eq('id', id);
      }
      return {
        success: false,
        status: 422,
        phase: 'build',
        error:
          `App "${id}" failed to build on Vercel. The metadata has been auto-archived. ` +
          'Inspect the deployErrorLog, fix the component, and call push_app again with the same id.',
        commit,
        deployErrorLog: deploy.errorLog,
        deploymentUid: deploy.deploymentUid,
      };
    }
  }

  const allWarnings = [...codeCheck.warnings, ...styleCheck.warnings];
  return {
    success: true,
    id,
    route: `/app/${route}`,
    commit,
    supabase: upsert.error ? { error: upsert.error.message } : { ok: true },
    deploy,
    warnings: allWarnings.length ? allWarnings : undefined,
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


export async function getAppSource(
  id: string,
  env: Env,
): Promise<
  { success: true; id: string; path: string; source: string } | OperationError
> {
  if (!isValidId(id)) {
    return { success: false, status: 400, error: 'Invalid `id`.' };
  }
  const path = `src/apps/${id}/index.tsx`;
  const file = await getFileFromGitHub(env, path);
  if (!file.ok) {
    return {
      success: false,
      status: file.status,
      error:
        file.status === 404
          ? `No source committed for app "${id}" at ${path}.`
          : file.error,
    };
  }
  return { success: true, id, path, source: file.content };
}
