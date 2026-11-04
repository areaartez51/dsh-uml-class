// Structural checks over a rendered HTML file. No browser, no network.

function attributesOf(tag) {
  const attributes = {};
  const pattern = /([a-zA-Z0-9-:]+)(?:="([^"]*)")?/g;
  let match;
  while ((match = pattern.exec(tag)) !== null) {
    attributes[match[1]] = match[2] === undefined ? '' : match[2];
  }
  return attributes;
}

function collect(html, kind, marker) {
  const pattern = new RegExp(`<g[^>]*\\bclass="${kind}[^"]*"[^>]*\\b${marker}=[^>]*>`, 'g');
  return (html.match(pattern) || []).map(attributesOf);
}

/**
 * Verify the rendered artifact: adjacency data, expander markup, offline-ness.
 * Returns { ok, errors, stats }.
 */
export function checkHtml(html) {
  // Client code mentions the same attribute names; only markup counts.
  const markup = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const errors = [];
  const nodes = collect(markup, 'node', 'data-node');
  const edges = collect(markup, 'edge', 'data-edge');
  const toggles = (markup.match(/data-expand-toggle/g) || []).length;
  const sections = (markup.match(/data-member-section=/g) || []).length;

  if (nodes.length === 0) errors.push('no [data-node] groups found');

  const byId = new Map();
  for (const node of nodes) {
    if (!node['data-node']) continue;
    if (byId.has(node['data-node'])) {
      errors.push(`duplicate node id "${node['data-node']}"`);
    }
    byId.set(node['data-node'], node);
  }

  for (const edge of edges) {
    const from = edge['data-from'];
    const to = edge['data-to'];
    if (!byId.has(from)) errors.push(`edge "${edge['data-edge']}" points from unknown node "${from}"`);
    if (!byId.has(to)) errors.push(`edge "${edge['data-edge']}" points to unknown node "${to}"`);
  }

  for (const [id, node] of byId) {
    const neighbors = (node['data-neighbors'] || '').split(',').filter(Boolean);
    for (const neighbor of neighbors) {
      if (!byId.has(neighbor)) {
        errors.push(`node "${id}" lists unknown neighbor "${neighbor}"`);
        continue;
      }
      const reciprocal = (byId.get(neighbor)['data-neighbors'] || '').split(',').filter(Boolean);
      if (!reciprocal.includes(id)) {
        errors.push(`node "${id}" lists "${neighbor}", but "${neighbor}" does not list "${id}"`);
      }
    }
  }

  for (const edge of edges) {
    const from = byId.get(edge['data-from']);
    const to = byId.get(edge['data-to']);
    if (!from || !to) continue;
    const fromNeighbors = (from['data-neighbors'] || '').split(',').filter(Boolean);
    const toNeighbors = (to['data-neighbors'] || '').split(',').filter(Boolean);
    if (!fromNeighbors.includes(edge['data-to'])) {
      errors.push(`edge "${edge['data-edge']}": target missing from data-neighbors of "${edge['data-from']}"`);
    }
    if (!toNeighbors.includes(edge['data-from'])) {
      errors.push(`edge "${edge['data-edge']}": source missing from data-neighbors of "${edge['data-to']}"`);
    }
  }

  const expandable = nodes.filter((node) => node['data-has-members'] === '1');
  if (expandable.length !== toggles) {
    errors.push(`expected ${expandable.length} expanders, found ${toggles}`);
  }
  if (expandable.length > 0 && sections === 0) {
    errors.push('expandable nodes exist but no [data-member-section] found');
  }

  if (/<script[^>]+\bsrc=/i.test(markup)) errors.push('external <script src> found');
  if (/<link[^>]+\bhref=["']https?:/i.test(markup)) errors.push('external stylesheet link found');
  if (/url\(\s*["']?https?:/i.test(markup)) errors.push('external url() reference found');
  if (/\bfetch\s*\(/.test(html)) errors.push('fetch() found — artifact must stay offline');

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      expandable: expandable.length,
      expanders: toggles,
      sections,
    },
  };
}
