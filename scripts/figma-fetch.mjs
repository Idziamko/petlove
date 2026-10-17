import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiOrigin = 'https://api.figma.com';

export function parseFigmaUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['figma.com', 'www.figma.com'].includes(url.hostname)) throw new Error('Use an HTTPS Figma file or design URL.');
  const match = url.pathname.match(/^\/(?:design|file|proto|board)\/([a-zA-Z0-9]+)(?:\/|$)/);
  if (!match) throw new Error('The URL does not contain a Figma file key.');
  const node = url.searchParams.get('node-id')?.replace(/^(\d+)-(\d+)$/, '$1:$2');
  if (node && !/^\d+:\d+$/.test(node)) throw new Error('Invalid node-id.');
  return { fileKey: match[1], nodeId: node };
}

export function parseOptions(args) {
  const options = { url: '', nodes: [], formats: [], assets: false, svgIcons: false, refresh: false, offline: false, out: resolve(project, 'design/figma') };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (['--assets', '--svg-icons', '--refresh', '--offline'].includes(argument)) {
      options[{ '--assets': 'assets', '--svg-icons': 'svgIcons', '--refresh': 'refresh', '--offline': 'offline' }[argument]] = true;
    } else if (['--nodes', '--format', '--out', '--version', '--depth'].includes(argument)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}.`);
      if (argument === '--nodes') options.nodes = value.split(',').map(node => node.replace(/^(\d+)-(\d+)$/, '$1:$2'));
      if (argument === '--format') options.formats = [...new Set(value.split(','))];
      if (argument === '--out') options.out = resolve(value);
      if (argument === '--version') options.version = value;
      if (argument === '--depth') options.depth = Number(value);
    } else if (!argument.startsWith('-') && !options.url) options.url = argument;
    else throw new Error('Unknown argument. Run with --help for usage.');
  }
  if (!options.url) throw new Error('A Figma URL is required.');
  if (options.nodes.some(node => !/^\d+:\d+$/.test(node))) throw new Error('Node IDs must use 123:456 or 123-456.');
  if (options.formats.some(format => !['png', 'svg', 'jpg', 'pdf'].includes(format))) throw new Error('Supported formats: png, svg, jpg, pdf.');
  if (options.depth !== undefined && (!Number.isInteger(options.depth) || options.depth < 1)) throw new Error('Depth must be a positive integer.');
  if (options.refresh && options.offline) throw new Error('--refresh and --offline cannot be combined.');
  return options;
}

export function retryDelay(value, now = Date.now()) {
  if (!value) return 60_000;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 60_000;
}

async function jsonFile(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw new Error('A cached JSON file is unreadable. Remove that file and retry.'); }
}

async function save(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, value, { mode: 0o600 });
  await rename(temporary, path);
}

export function createApi({ token, cache, refresh = false, offline = false, request = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  return async function get(path, parameters = {}) {
    const url = new URL(`/v1${path}`, apiOrigin);
    for (const [key, value] of Object.entries(parameters)) if (value !== undefined) url.searchParams.set(key, String(value));
    url.searchParams.sort();
    const hash = createHash('sha256').update(url.href).digest('hex');
    const file = resolve(cache, `${hash}.json`);
    const cached = await jsonFile(file);
    if (cached && !refresh) {
      console.log(`Cache: ${url.pathname} (saved ${cached.savedAt})`);
      return cached.data;
    }
    if (offline) throw new Error('This request is not cached. Run online once with FIGMA_TOKEN configured.');
    if (!token) throw new Error('FIGMA_TOKEN is missing. Add it to the local .env with file_content:read permission.');
    const limitFile = resolve(cache, 'rate-limit.json');
    const limit = await jsonFile(limitFile);
    if (limit?.retryAt > Date.now()) throw new Error(`Figma rate limit. Retry after ${new Date(limit.retryAt).toISOString()}. Cached requests remain available.`);
    for (let attempt = 0; attempt < 3; attempt++) {
      let response;
      try { response = await request(url, { headers: { 'X-Figma-Token': token }, redirect: 'error', signal: AbortSignal.timeout(45_000) }); }
      catch { throw new Error('Figma API connection failed or timed out. Existing cache has been preserved.'); }
      if (response.status === 429) {
        const delay = retryDelay(response.headers.get('retry-after'));
        const retryAt = Date.now() + delay;
        await save(limitFile, JSON.stringify({ retryAt }));
        if (delay > 30_000 || attempt === 2) throw new Error(`Figma rate limit. Retry after ${new Date(retryAt).toISOString()}. Cached requests remain available.`);
        await pause(Math.max(1000, delay));
        continue;
      }
      if (response.status >= 500 && attempt < 2) { await pause(1000 * 2 ** attempt); continue; }
      if (response.status === 401 || response.status === 403) throw new Error('Figma rejected access. Check token expiry, file_content:read permission and access to this file.');
      if (response.status === 404) throw new Error('Figma file or node not found, or not accessible to this token.');
      if (!response.ok) throw new Error(`Figma API returned HTTP ${response.status}.`);
      let data;
      try { data = await response.json(); } catch { throw new Error('Figma returned invalid JSON.'); }
      if (data.err || data.error) throw new Error('Figma could not process this file or export request.');
      await save(file, JSON.stringify({ savedAt: new Date().toISOString(), data }));
      return data;
    }
    throw new Error('Figma API request failed.');
  };
}

function visit(node, callback) {
  callback(node);
  for (const child of node.children || []) visit(child, callback);
}

async function download(url, destination, offline) {
  try { await readFile(destination); return; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (offline) throw new Error('A required exported asset is missing from the offline cache.');
  const source = new URL(url);
  if (source.protocol !== 'https:' || !['figma.com', 'amazonaws.com'].some(domain => source.hostname === domain || source.hostname.endsWith(`.${domain}`))) throw new Error('Unexpected Figma asset host. Asset was not downloaded.');
  let response;
  try { response = await fetch(source, { signal: AbortSignal.timeout(45_000) }); }
  catch { throw new Error('Asset download failed or timed out. Retry online to refresh export URLs.'); }
  if (!response.ok) throw new Error(`Asset download returned HTTP ${response.status}. Use --refresh if the cached export URL expired.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  await save(destination, bytes);
}

async function readToken() {
  if (process.env.FIGMA_TOKEN?.trim()) return process.env.FIGMA_TOKEN.trim();
  try {
    const source = await readFile(resolve(project, '.env'), 'utf8');
    const match = source.match(/^\s*(?:export\s+)?FIGMA_TOKEN\s*=\s*(.*?)\s*$/m);
    if (!match) return '';
    const value = match[1];
    return /^['"]/.test(value) ? value.slice(1, value.lastIndexOf(value[0])).trim() : value.split(/\s+#/)[0].trim();
  } catch (error) { if (error.code === 'ENOENT') return ''; throw new Error('Unable to read the local .env file.'); }
}

export async function run(args) {
  if (args.includes('--help')) {
    console.log('Usage: node scripts/figma-fetch.mjs "FIGMA_URL" [--nodes 1:2,3:4] [--format png,svg] [--svg-icons] [--assets] [--version ID] [--depth N] [--refresh | --offline] [--out DIRECTORY]\nDefaults: reuse cached JSON; no rendered exports unless --format is supplied. --svg-icons batches leaf vector exports. --assets downloads original image fills. Cache files and signed asset URLs stay local.');
    return;
  }
  const options = parseOptions(args);
  const { fileKey, nodeId } = parseFigmaUrl(options.url);
  const ids = [...new Set(options.nodes.length ? options.nodes : nodeId ? [nodeId] : [])];
  const output = resolve(options.out, fileKey);
  const api = createApi({ token: await readToken(), cache: resolve(output, 'cache'), refresh: options.refresh, offline: options.offline });
  const query = { geometry: 'paths', version: options.version, depth: options.depth };
  const data = ids.length ? await api(`/files/${fileKey}/nodes`, { ...query, ids: ids.join(',') }) : await api(`/files/${fileKey}`, query);
  const roots = ids.length ? ids.map(id => data.nodes?.[id]?.document) : [data.document];
  if (roots.some(node => !node)) throw new Error('One or more requested nodes do not exist in this file.');
  const suffix = createHash('sha256').update(JSON.stringify({ ids, query })).digest('hex').slice(0, 12);
  await save(resolve(output, `nodes-${suffix}.json`), JSON.stringify(data, null, 2));
  const layers = [];
  const imageRefs = new Set();
  const vectorIds = new Set();
  for (const root of roots) visit(root, node => {
    layers.push({ id: node.id, name: node.name, type: node.type, bounds: node.absoluteBoundingBox, visible: node.visible !== false, layoutMode: node.layoutMode, itemSpacing: node.itemSpacing, paddingTop: node.paddingTop, paddingRight: node.paddingRight, paddingBottom: node.paddingBottom, paddingLeft: node.paddingLeft, cornerRadius: node.cornerRadius, fills: node.fills, strokes: node.strokes, strokeWeight: node.strokeWeight, opacity: node.opacity, effects: node.effects, text: node.characters, textStyle: node.style, componentId: node.componentId, componentProperties: node.componentProperties });
    for (const paint of [...(node.fills || []), ...(node.strokes || [])]) if (paint.type === 'IMAGE' && paint.imageRef) imageRefs.add(paint.imageRef);
    if (node.visible !== false && ['VECTOR', 'BOOLEAN_OPERATION', 'COMPONENT', 'INSTANCE', 'FRAME'].includes(node.type) && node.absoluteBoundingBox?.width <= 96 && node.absoluteBoundingBox?.height <= 96) vectorIds.add(node.id);
  });
  await save(resolve(output, `layers-${suffix}.json`), JSON.stringify(layers, null, 2));
  const assetVersion = createHash('sha256').update(data.version || data.lastModified || JSON.stringify(data)).digest('hex').slice(0, 12);
  const report = { fileKey, version: data.version, lastModified: data.lastModified, nodeCount: layers.length, nodes: ids, exports: [], imageFills: [], warnings: [] };
  const requestedExports = ids.length ? ids : roots.flatMap(root => root.type === 'DOCUMENT' ? (root.children || []).flatMap(page => (page.children || []).filter(node => ['FRAME', 'COMPONENT', 'COMPONENT_SET'].includes(node.type)).map(node => node.id)) : [root.id]);
  const exportIds = async (nodes, format) => {
    for (let index = 0; index < nodes.length; index += 50) {
      const batch = nodes.slice(index, index + 50);
      const result = await api(`/images/${fileKey}`, { ids: batch.join(','), format, scale: format === 'svg' ? undefined : 2, version: data.version || options.version });
      for (const id of batch) {
        if (!result.images?.[id]) { report.warnings.push(`No ${format} export for ${id}.`); continue; }
        const path = resolve(output, 'exports', assetVersion, `${id.replace(':', '-')}.${format}`);
        await download(result.images[id], path, options.offline);
        report.exports.push({ id, format, path });
      }
    }
  };
  for (const format of options.formats) await exportIds(requestedExports, format);
  if (options.svgIcons) await exportIds([...vectorIds].filter(id => !options.formats.includes('svg') || !requestedExports.includes(id)), 'svg');
  if (options.assets && imageRefs.size) {
    const result = await api(`/files/${fileKey}/images`);
    for (const ref of imageRefs) {
      const url = result.meta?.images?.[ref];
      if (!url) { report.warnings.push(`No image fill for ${ref}.`); continue; }
      if (!/^[a-zA-Z0-9_-]+$/.test(ref)) throw new Error('Invalid image reference.');
      const path = resolve(output, 'fills', `${ref}.image`);
      await download(url, path, options.offline);
      report.imageFills.push({ ref, path });
    }
  }
  await save(resolve(output, `manifest-${suffix}.json`), JSON.stringify(report, null, 2));
  console.log(`Saved ${layers.length} layers, ${report.exports.length} exports and ${report.imageFills.length} image fills to ${output}.`);
  for (const warning of report.warnings) console.warn(warning);
  if (report.warnings.length) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.argv.slice(2)).catch(error => {
    const message = error instanceof Error ? error.message : 'Figma download failed.';
    console.error(message.replace(/figd_[a-zA-Z0-9_-]+/g, '[redacted]'));
    process.exitCode = 1;
  });
}
