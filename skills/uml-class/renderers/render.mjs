// Orchestration: spec -> layout -> svg -> standalone html.

import { buildLayout } from './layout.mjs';
import { renderHtml } from './html.mjs';
import { renderSvg } from './svg.mjs';

export function renderDiagram(spec) {
  const layout = buildLayout(spec);
  const svgData = renderSvg(spec, layout);
  const html = renderHtml(spec, svgData);
  return {
    html,
    svg: svgData.svg,
    edges: svgData.edges,
    stats: svgData.stats,
    warnings: layout.warnings,
  };
}
