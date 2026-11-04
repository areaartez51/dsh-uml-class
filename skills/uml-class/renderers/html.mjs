// Self-contained HTML shell: dark theme, coloured classes, member highlight, drag.

import { escapeXml } from './routing.mjs';

const STYLE = `
:root {
  --bg: #0e1116;
  --panel: #171b22;
  --ink: #e5e7eb;
  --ink-soft: #c3c9d4;
  --ink-mute: #8b93a3;
  --line: #2c333f;
  --accent: #60a5fa;
  --accent-soft: #1e3a5f;
  --pkg: #5b6675;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.35);
  --class-alpha: 26%;
  color-scheme: dark;
}
:root[data-theme="light"] {
  --bg: #f6f7f9;
  --panel: #ffffff;
  --ink: #111827;
  --ink-soft: #4b5563;
  --ink-mute: #6b7280;
  --line: #c3c9d4;
  --accent: #2563eb;
  --accent-soft: #dbeafe;
  --pkg: #94a3b8;
  --shadow: 0 1px 2px rgba(16, 24, 40, 0.06), 0 8px 24px rgba(16, 24, 40, 0.06);
  color-scheme: light;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { height: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: "Segoe UI", "Inter", system-ui, -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
  box-shadow: var(--shadow);
  z-index: 2;
}
.title { font-size: 15px; font-weight: 650; letter-spacing: 0.1px; white-space: nowrap; }
.meta { font-size: 12px; color: var(--ink-mute); white-space: nowrap; }
.spacer { flex: 1; }
.search {
  width: 190px;
  padding: 7px 11px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink);
  font-size: 13px;
  outline: none;
}
.search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
button {
  padding: 7px 11px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink-soft);
  font-size: 12.5px;
  cursor: pointer;
  white-space: nowrap;
}
button:hover { border-color: var(--accent); color: var(--accent); }
.slider {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ink-mute);
  white-space: nowrap;
}
.slider input { width: 110px; accent-color: var(--accent); }
#wrap { position: relative; flex: 1; overflow: hidden; cursor: grab; }
#wrap.dragging { cursor: grabbing; }
.diagram { position: absolute; top: 0; left: 0; transform-origin: 0 0; overflow: visible; }
.hint {
  position: absolute;
  left: 18px;
  bottom: 12px;
  font-size: 12px;
  color: var(--ink-mute);
  background: color-mix(in srgb, var(--panel) 82%, transparent);
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--line);
  pointer-events: none;
}
.legend {
  position: absolute;
  right: 18px;
  bottom: 48px;
  max-width: 330px;
  padding: 12px 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--shadow);
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.35;
}
.legend h4 { margin: 0 0 8px; font-size: 12px; letter-spacing: .3px; color: var(--ink); }
.legend-row { display: flex; align-items: center; gap: 9px; margin: 7px 0; }
.legend-row svg { flex: 0 0 auto; }
.legend-note { margin-top: 9px; color: var(--ink-mute); font-size: 11px; }
.package-frame {
  fill: color-mix(in srgb, var(--pkg) 6%, transparent);
  stroke: var(--pkg);
  stroke-width: 1;
  stroke-dasharray: 5 5;
  opacity: .55;
  pointer-events: none;
}
.package-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 18;
  pointer-events: stroke;
  cursor: move;
}
.package-label { cursor: move; }
.package-label rect { fill: var(--panel); stroke: var(--pkg); stroke-width: 1; }
.package-label text { fill: var(--ink-mute); font-size: 11px; font-weight: 600; letter-spacing: .3px; }
.node { cursor: move; transition: opacity .15s ease; }
.node .box {
  fill: color-mix(in srgb, var(--c) var(--class-alpha), var(--panel));
  stroke: var(--c);
  stroke-width: 1.6;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, .25));
  transition: stroke .15s ease, opacity .15s ease, stroke-width .15s ease;
}
.node .body {
  fill: color-mix(in srgb, var(--c) 7%, var(--panel));
  stroke: var(--line);
  stroke-width: 1;
}
.node .stripe { fill: var(--c); }
.node .stereo { fill: color-mix(in srgb, var(--c) 72%, var(--ink)); font-size: 11px; letter-spacing: .2px; }
.node .name { fill: var(--ink); font-size: 15px; font-weight: 650; }
.node .sep { stroke: color-mix(in srgb, var(--c) 40%, var(--line)); stroke-width: 1; }
.node .section { fill: color-mix(in srgb, hsl(var(--h) 58% 60%) 60%, var(--ink)); font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
.node .member { fill: color-mix(in srgb, hsl(var(--h) 62% 65%) var(--mix, 60%), var(--ink)); font-size: 12px; font-family: "JetBrains Mono", "Cascadia Code", ui-monospace, monospace; }
.member-row { cursor: pointer; }
.member-row .member-bg { fill: color-mix(in srgb, var(--c) 22%, transparent); opacity: 0; transition: opacity .12s ease; }
.member-row:hover .member-bg, .member-row.hl .member-bg { opacity: 1; }
.node .expander-bg { fill: color-mix(in srgb, var(--c) 10%, transparent); }
.node .chev { fill: none; stroke: color-mix(in srgb, var(--c) 70%, var(--ink)); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.node .expander:hover .chev { stroke: var(--ink); }
.node.st-abstract .name { font-style: italic; }
.edge .line { fill: none; stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; }
.edge-hit { fill: none; stroke: transparent; stroke-width: 16; pointer-events: stroke; cursor: pointer; }
.edge.frozen .line { stroke-width: 3.4; }
.edge.frozen .head-tri, .edge.frozen .head-open { stroke-width: 2; }
svg.has-freeze .edge:not(.frozen) { opacity: .12; }
svg.has-freeze .node:not(.frozen-endpoint) { opacity: .2; }
svg.has-freeze .package { opacity: .3; }
svg.has-freeze .node.frozen-endpoint .box { stroke-width: 2.2; }
.edge.k-dependency .line, .edge.k-realization .line { stroke-dasharray: 6 5; }
.head-tri { fill: var(--panel); stroke: var(--head); stroke-width: 1.5; stroke-linejoin: round; }
.head-open { fill: none; stroke: var(--head); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.pin { stroke: var(--panel); stroke-width: 1.6; }
.zonepin { fill: var(--panel); stroke: var(--ink-mute); stroke-width: 1.5; }
.pin-stem { stroke-width: 2; stroke-linecap: round; opacity: .85; }
.pin-group.off { display: none; }
.pin.off { display: none; }
.pins { pointer-events: none; }
.edge-label rect { fill: var(--panel); stroke: var(--line); stroke-width: .8; }
.edge-label text { fill: var(--ink-soft); font-size: 11px; font-family: "JetBrains Mono", ui-monospace, monospace; }
.node.dim { opacity: .2; }
.edge.dim { opacity: .1; }
.edge.hl .line { stroke-width: 3; filter: brightness(1.35); }
.node.hl .box { stroke-width: 2.8; }
.node.hit .box { stroke-width: 3; }
`;

const CLIENT = `
(function () {
  'use strict';
  var svg = document.getElementById('d');
  var wrap = document.getElementById('wrap');
  if (!svg || !wrap) return;

  var view = { scale: 1, tx: 0, ty: 0 };
  var HEADER = 28;

  function applyView() {
    svg.style.transform = 'translate(' + view.tx + 'px,' + view.ty + 'px) scale(' + view.scale + ')';
  }

  function fit() {
    var rect = wrap.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    var k = Math.min((rect.width - 90) / vb.width, (rect.height - 90) / vb.height, 1);
    view.scale = Math.max(0.15, k || 1);
    view.tx = (rect.width - vb.width * view.scale) / 2;
    view.ty = Math.max(10, (rect.height - vb.height * view.scale) / 2);
    applyView();
  }

  function nodeById(id) {
    return svg.querySelector('[data-node="' + id + '"]');
  }

  function rectOf(node) {
    return {
      x: Number(node.getAttribute('data-x')),
      y: Number(node.getAttribute('data-y')),
      w: Number(node.getAttribute('data-w')),
      h: Number(node.getAttribute('data-h'))
    };
  }

  function anchorY(node, rawAnchor) {
    var expanded = node.getAttribute('data-expanded') === 'true';
    var rect = rectOf(node);
    if (expanded && rawAnchor) return rect.y + Number(rawAnchor);
    return rect.y + HEADER;
  }

  // Package frames are the zones: their current rect gives the border coordinates.
  function packageRects() {
    var map = {};
    var packages = svg.querySelectorAll('.package[data-package]');
    for (var i = 0; i < packages.length; i += 1) {
      var frame = packages[i].querySelector('.package-frame');
      if (!frame) continue;
      var x = Number(frame.getAttribute('x'));
      var y = Number(frame.getAttribute('y'));
      var w = Number(frame.getAttribute('width'));
      var h = Number(frame.getAttribute('height'));
      var zone = { left: x, right: x + w, top: y, bottom: y + h };
      var ids = (packages[i].getAttribute('data-members') || '').split(',');
      for (var j = 0; j < ids.length; j += 1) {
        if (ids[j]) map[ids[j]] = zone;
      }
    }
    return map;
  }

  function claim(x, top, bottom, used, clear) {
    var candidate = x;
    for (var attempt = 0; attempt < 12; attempt += 1) {
      var clash = false;
      for (var i = 0; i < used.length; i += 1) {
        var entry = used[i];
        if (Math.abs(entry.x - candidate) < 16 && entry.top < bottom && entry.bottom > top) { clash = true; break; }
      }
      if (!clash && clear(candidate)) {
        used.push({ x: candidate, top: top, bottom: bottom });
        return candidate;
      }
      candidate += 30;
    }
    used.push({ x: candidate, top: top, bottom: bottom });
    return candidate;
  }

  function route(from, to, yFrom, yTo, obstacles, used, zone) {
    var top = Math.min(yFrom, yTo);
    var bottom = Math.max(yFrom, yTo);
    function clear(x) {
      for (var i = 0; i < obstacles.length; i += 1) {
        var n = obstacles[i];
        if (x > n.x - 12 && x < n.x + n.w + 12 && n.y < bottom && n.y + n.h > top) return false;
      }
      return true;
    }
    function taken(x) {
      for (var i = 0; i < used.length; i += 1) {
        var entry = used[i];
        if (Math.abs(entry.x - x) < 16 && entry.top < bottom && entry.bottom > top) return true;
      }
      return false;
    }
    function inside(x) {
      return !zone || (x > zone.left + 12 && x < zone.right - 12);
    }
    function clampX(x) {
      return zone ? Math.min(Math.max(x, zone.left + 14), zone.right - 14) : x;
    }

    var cF = from.x + from.w / 2;
    var cT = to.x + to.w / 2;
    var overlapping = Math.abs(cF - cT) < (from.w + to.w) / 2 - 6;

    if (overlapping) {
      var corridor = clampX(Math.max(from.x + from.w, to.x + to.w) + 26);
      var guard = 0;
      while ((!clear(corridor) || !inside(corridor)) && guard < 40) { corridor += 34; guard += 1; }
      corridor = claim(corridor, top, bottom, used, clear);
      return [[from.x + from.w, yFrom], [corridor, yFrom], [corridor, yTo], [to.x + to.w, yTo]];
    }

    var toRight = cT > cF;
    var startX = toRight ? from.x + from.w : from.x;
    var endX = toRight ? to.x : to.x + to.w;
    var midX = clampX((startX + endX) / 2);
    var corridor2 = null;

    if (inside(midX) && clear(midX) && !taken(midX)) {
      corridor2 = midX;
    } else {
      var candidates = [];
      for (var j = 0; j < obstacles.length; j += 1) {
        candidates.push(obstacles[j].x - 22, obstacles[j].x + obstacles[j].w + 22);
      }
      candidates.sort(function (a, b) { return Math.abs(a - midX) - Math.abs(b - midX) || a - b; });
      for (var k = 0; k < candidates.length; k += 1) {
        var candidate = candidates[k];
        if (candidate <= Math.min(startX, endX) + 6 || candidate >= Math.max(startX, endX) - 6) continue;
        if (!inside(candidate) || !clear(candidate) || taken(candidate)) continue;
        corridor2 = candidate;
        break;
      }
    }

    if (corridor2 === null) {
      var far = clampX(Math.max(from.x + from.w, to.x + to.w) + 26);
      var guard2 = 0;
      while ((!clear(far) || !inside(far)) && guard2 < 40) { far += 34; guard2 += 1; }
      corridor2 = claim(far, top, bottom, used, clear);
      return [[from.x + from.w, yFrom], [corridor2, yFrom], [corridor2, yTo], [to.x + to.w, yTo]];
    }

    used.push({ x: corridor2, top: top, bottom: bottom });
    return [[startX, yFrom], [corridor2, yFrom], [corridor2, yTo], [endX, yTo]];
  }

  function routeIntra(from, to, yFrom, yTo) {
    var exitX = from.x + from.w;
    var entryX = to.x;
    if (entryX > exitX + 8) {
      var midX = (exitX + entryX) / 2;
      if (Math.abs(yTo - yFrom) < 0.5) {
        return [[exitX, yFrom], [entryX, yTo]];
      }
      return [[exitX, yFrom], [midX, yFrom], [midX, yTo], [entryX, yTo]];
    }
    var below = yTo >= yFrom;
    var laneY = below ? to.y + to.h + 16 : to.y - 16;
    var outX = exitX + 22;
    var inX = entryX - 22;
    return [
      [exitX, yFrom],
      [outX, yFrom],
      [outX, laneY],
      [inX, laneY],
      [inX, yTo],
      [entryX, yTo]
    ];
  }

  function toPath(points) {
    var d = 'M ' + points[0][0] + ' ' + points[0][1];
    for (var i = 1; i < points.length; i += 1) d += ' L ' + points[i][0] + ' ' + points[i][1];
    return d;
  }

  function dedupePoints(points) {
    var result = [];
    for (var i = 0; i < points.length; i += 1) {
      var point = points[i];
      var previous = result[result.length - 1];
      if (previous && Math.abs(previous[0] - point[0]) < 0.01 && Math.abs(previous[1] - point[1]) < 0.01) continue;
      result.push(point);
    }
    return result.length >= 2 ? result : points;
  }

  function longestSegment(points) {
    var best = null;
    for (var i = 1; i < points.length; i += 1) {
      var a = points[i - 1], b = points[i];
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (!best || len > best.len) best = { len: len, a: a, b: b };
    }
    return best;
  }

  function applyEdge(edge, used) {
    var from = nodeById(edge.getAttribute('data-from'));
    var to = nodeById(edge.getAttribute('data-to'));
    if (!from || !to) return;

    var fr = rectOf(from), tr = rectOf(to);
    var yFrom = anchorY(from, edge.getAttribute('data-from-anchor'));
    var yTo = anchorY(to, edge.getAttribute('data-to-anchor'));

    var obstacles = [];
    var all = svg.querySelectorAll('[data-node]');
    for (var q = 0; q < all.length; q += 1) {
      if (all[q] === from || all[q] === to) continue;
      obstacles.push(rectOf(all[q]));
    }

    var points = [];
    var exitPoint = null;
    var entryPoint = null;
    var zones = packageRects();
    var zoneFrom = zones[from.getAttribute('data-node')] || null;
    var zoneTo = zones[to.getAttribute('data-node')] || null;

    if (zoneFrom && zoneTo && zoneFrom !== zoneTo) {
      // Crossing zones: right border out, left border in.
      var rightward = (zoneTo.left + zoneTo.right) / 2 > (zoneFrom.left + zoneFrom.right) / 2;
      var startX = rightward ? fr.x + fr.w : fr.x;
      var endX = rightward ? tr.x : tr.x + tr.w;
      var exitX = rightward ? zoneFrom.right : zoneFrom.left;
      var entryX = rightward ? zoneTo.left : zoneTo.right;
      var gapMid = (exitX + entryX) / 2;
      gapMid = claim(gapMid, Math.min(yFrom, yTo), Math.max(yFrom, yTo), used, function () { return true; });
      exitPoint = [exitX, yFrom];
      entryPoint = [entryX, yTo];
      points = [
        [startX, yFrom],
        [exitX, yFrom],
        [gapMid, yFrom],
        [gapMid, yTo],
        [entryX, yTo],
        [endX, yTo]
      ];
    } else {
      points = routeIntra(fr, tr, yFrom, yTo);
    }
    points = dedupePoints(points);

    var exitPin = edge.querySelector('.zonepin[data-role="exit"]');
    if (exitPin) {
      if (exitPoint) {
        exitPin.setAttribute('cx', exitPoint[0]);
        exitPin.setAttribute('cy', exitPoint[1]);
        exitPin.removeAttribute('display');
      } else {
        exitPin.setAttribute('display', 'none');
      }
    }
    var entryPin = edge.querySelector('.zonepin[data-role="entry"]');
    if (entryPin) {
      if (entryPoint) {
        entryPin.setAttribute('cx', entryPoint[0]);
        entryPin.setAttribute('cy', entryPoint[1]);
        entryPin.removeAttribute('display');
      } else {
        entryPin.setAttribute('display', 'none');
      }
    }
    var last = points[points.length - 1];
    var prev = points[points.length - 2];
    var dx = last[0] - prev[0], dy = last[1] - prev[1];
    var len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;
    var kind = edge.getAttribute('data-kind');
    var head = (kind === 'inheritance' || kind === 'realization') ? 15 : 13;
    var trimmed = points.slice(0, points.length - 1);
    trimmed.push([last[0] - ux * head, last[1] - uy * head]);

    var line = edge.querySelector('path.line');
    if (line) {
      line.setAttribute('d', toPath(trimmed));
    }

    var headWrap = edge.querySelector('.head-wrap');
    if (headWrap) {
      var angle = Math.atan2(uy, ux) * 180 / Math.PI;
      headWrap.setAttribute('transform', 'translate(' + last[0] + ',' + last[1] + ') rotate(' + angle + ')');
    }

    var gradient = document.getElementById('eg-' + edge.getAttribute('data-edge'));
    if (gradient) {
      gradient.setAttribute('x1', points[0][0]);
      gradient.setAttribute('y1', points[0][1]);
      gradient.setAttribute('x2', last[0]);
      gradient.setAttribute('y2', last[1]);
    }

    var label = edge.querySelector('.edge-label');
    if (label) {
      var rect = label.querySelector('rect');
      var seg = longestSegment(trimmed);
      if (seg && rect) {
        var horizontal = Math.abs(seg.a[0] - seg.b[0]) >= Math.abs(seg.a[1] - seg.b[1]);
        var cx = horizontal ? (seg.a[0] + seg.b[0]) / 2 : (seg.a[0] + seg.b[0]) / 2 + 13;
        var ordinal = Number(edge.getAttribute('data-ordinal') || 0);
        var spread = 0.22 + (ordinal % 4) * 0.16;
        var cy = horizontal
          ? (seg.a[1] + seg.b[1]) / 2 - 13
          : seg.a[1] + (seg.b[1] - seg.a[1]) * spread;
        var w = Number(rect.getAttribute('width'));
        var h = Number(rect.getAttribute('height'));
        label.setAttribute('transform', 'translate(' + (cx - w / 2) + ',' + (cy - h / 2) + ')');
      }
    }
  }

  function rerouteAll() {
    var edges = svg.querySelectorAll('[data-edge]');
    var used = [];
    for (var i = 0; i < edges.length; i += 1) applyEdge(edges[i], used);
    syncPins();
  }

  // One pin per member per side, on the field boundary, only where an edge really leaves.
  function syncPins() {
    var pins = svg.querySelectorAll('.pin-group');
    if (!pins.length) return;
    var need = {};
    var zones = packageRects();
    var edges = svg.querySelectorAll('[data-edge]');
    for (var i = 0; i < edges.length; i += 1) {
      var edge = edges[i];
      var from = nodeById(edge.getAttribute('data-from'));
      var to = nodeById(edge.getAttribute('data-to'));
      if (!from || !to) continue;
      var fr = rectOf(from);
      var tr = rectOf(to);
      var zoneFrom = zones[from.getAttribute('data-node')] || null;
      var zoneTo = zones[to.getAttribute('data-node')] || null;
      var rightward = true;
      if (zoneFrom && zoneTo && zoneFrom !== zoneTo) {
        rightward = (zoneTo.left + zoneTo.right) / 2 > (zoneFrom.left + zoneFrom.right) / 2;
      }
      var fromMember = edge.getAttribute('data-from-member');
      var toMember = edge.getAttribute('data-to-member');
      if (fromMember !== '') {
        need[edge.getAttribute('data-from') + '|' + fromMember + '|' + (rightward ? 'right' : 'left')] = true;
      }
      if (toMember !== '') {
        need[edge.getAttribute('data-to') + '|' + toMember + '|' + (rightward ? 'left' : 'right')] = true;
      }
    }
    for (var j = 0; j < pins.length; j += 1) {
      var pin = pins[j];
      var key =
        pin.getAttribute('data-node') + '|' + pin.getAttribute('data-member') + '|' + pin.getAttribute('data-side');
      pin.classList.toggle('off', !need[key]);
    }
  }

  function syncPackages() {
    var groups = svg.querySelectorAll('.package[data-members]');
    for (var i = 0; i < groups.length; i += 1) {
      var group = groups[i];
      var ids = group.getAttribute('data-members').split(',').filter(Boolean);
      var member = {};
      for (var m = 0; m < ids.length; m += 1) member[ids[m]] = true;

      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (var j = 0; j < ids.length; j += 1) {
        var node = nodeById(ids[j]);
        if (!node) continue;
        var r = rectOf(node);
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.w);
        maxY = Math.max(maxY, r.y + r.h);
      }
      if (!isFinite(minX)) continue;

      // The frame hugs the classes: no expansion by line waypoints.
      var left = minX - 26, top = minY - 34;
      var width = maxX - minX + 52;
      var height = maxY - minY + 56;
      var frame = group.querySelector('.package-frame');
      var hit = group.querySelector('.package-hit');
      if (frame) {
        frame.setAttribute('x', left);
        frame.setAttribute('y', top);
        frame.setAttribute('width', width);
        frame.setAttribute('height', height);
      }
      if (hit) {
        hit.setAttribute('x', left);
        hit.setAttribute('y', top);
        hit.setAttribute('width', width);
        hit.setAttribute('height', height);
      }
      var label = group.querySelector('.package-label');
      if (label) label.setAttribute('transform', 'translate(' + (left + 14) + ',' + (top - 12) + ')');
    }
  }

  function syncBounds() {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var nodes = svg.querySelectorAll('[data-node]');
    for (var i = 0; i < nodes.length; i += 1) {
      var r = rectOf(nodes[i]);
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    }
    var edges = svg.querySelectorAll('[data-edge]');
    for (var j = 0; j < edges.length; j += 1) {
      var pairs = (edges[j].getAttribute('data-points') || '').split(' ').filter(Boolean);
      for (var k = 0; k < pairs.length; k += 1) {
        var xy = pairs[k].split(',');
        minX = Math.min(minX, Number(xy[0]));
        minY = Math.min(minY, Number(xy[1]));
        maxX = Math.max(maxX, Number(xy[0]));
        maxY = Math.max(maxY, Number(xy[1]));
      }
    }
    if (!isFinite(minX)) return;
    var pad = 48;
    var width = Math.ceil(maxX - minX + pad * 2);
    var height = Math.ceil(maxY - minY + pad * 2);
    svg.setAttribute('viewBox', (Math.floor(minX) - pad) + ' ' + (Math.floor(minY) - pad) + ' ' + width + ' ' + height);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
  }

  function toggleNode(node, force) {
    var expanded = node.getAttribute('data-expanded') === 'true';
    var target = typeof force === 'boolean' ? force : !expanded;
    if (target === expanded) return;

    var box = node.querySelector('rect.box');
    var stripe = node.querySelector('rect.stripe');
    var body = node.querySelector('rect.body');
    var expander = node.querySelector('.expander');
    var members = node.querySelector('.members');
    if (!box || !expander || !members) return;

    var delta = Number(node.getAttribute('data-expand-delta') || 0);
    var height = Number(box.getAttribute('height'));
    var next = target ? height + delta : height - delta;

    box.setAttribute('height', String(next));
    if (stripe) stripe.setAttribute('height', String(next));
    if (body) {
      if (target) body.removeAttribute('hidden');
      else body.setAttribute('hidden', '');
    }
    node.setAttribute('data-h', String(next));
    expander.setAttribute('transform', 'translate(0,' + (next - 20) + ')');
    if (target) members.removeAttribute('hidden');
    else members.setAttribute('hidden', '');
    var pins = node.querySelector('.pins');
    if (pins) {
      if (target) pins.removeAttribute('hidden');
      else pins.setAttribute('hidden', '');
    }

    node.setAttribute('data-expanded', String(target));
    var toggle = node.querySelector('[data-expand-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', String(target));

    rerouteAll();
    syncBounds();
  }

  // ---------- node dragging ----------
  function startPackageDrag(group, event) {
    event.stopPropagation();
    var ids = (group.getAttribute('data-members') || '').split(',').filter(Boolean);
    if (ids.length === 0) {
      var pkgId = group.getAttribute('data-package');
      var every = svg.querySelectorAll('[data-node]');
      for (var q = 0; q < every.length; q += 1) {
        if (every[q].getAttribute('data-pkg') === pkgId) ids.push(every[q].getAttribute('data-node'));
      }
    }
    var entries = [];
    for (var i = 0; i < ids.length; i += 1) {
      var node = nodeById(ids[i]);
      if (!node) continue;
      entries.push({
        node: node,
        x: Number(node.getAttribute('data-x')),
        y: Number(node.getAttribute('data-y'))
      });
    }
    var frame = group.querySelector('.package-frame');
    var hit = group.querySelector('.package-hit');
    var label = group.querySelector('.package-label');
    var frameBox = frame
      ? { x: Number(frame.getAttribute('x')), y: Number(frame.getAttribute('y')) }
      : null;
    var labelPos = frameBox ? { x: frameBox.x + 14, y: frameBox.y - 12 } : null;

    var startX = event.clientX;
    var startY = event.clientY;

    function move(moveEvent) {
      var dx = (moveEvent.clientX - startX) / view.scale;
      var dy = (moveEvent.clientY - startY) / view.scale;

      for (var j = 0; j < entries.length; j += 1) {
        var item = entries[j];
        var nx = item.x + dx;
        var ny = item.y + dy;
        item.node.setAttribute('data-x', String(nx));
        item.node.setAttribute('data-y', String(ny));
        item.node.setAttribute('transform', 'translate(' + nx + ',' + ny + ')');
      }

      // The frame is a rigid container: it moves, it does not re-measure while dragging.
      if (frameBox) {
        var fx = frameBox.x + dx;
        var fy = frameBox.y + dy;
        if (frame) {
          frame.setAttribute('x', String(fx));
          frame.setAttribute('y', String(fy));
        }
        if (hit) {
          hit.setAttribute('x', String(fx));
          hit.setAttribute('y', String(fy));
        }
      }
      if (labelPos && label) {
        label.setAttribute('transform', 'translate(' + (labelPos.x + dx) + ',' + (labelPos.y + dy) + ')');
      }

      rerouteAll();
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      syncPackages();
      syncBounds();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  svg.addEventListener('pointerdown', function (event) {
    var node = event.target.closest && event.target.closest('[data-node]');
    if (!node) {
      var group = event.target.closest && event.target.closest('.package');
      if (group) startPackageDrag(group, event);
      return;
    }
    if (event.target.closest('[data-expand-toggle]')) return;
    if (event.target.closest('[data-member]')) return;
    event.stopPropagation();

    var startX = event.clientX, startY = event.clientY;
    var baseX = Number(node.getAttribute('data-x'));
    var baseY = Number(node.getAttribute('data-y'));

    function move(moveEvent) {
      var dx = (moveEvent.clientX - startX) / view.scale;
      var dy = (moveEvent.clientY - startY) / view.scale;
      var nx = baseX + dx;
      var ny = baseY + dy;
      node.setAttribute('data-x', String(nx));
      node.setAttribute('data-y', String(ny));
      node.setAttribute('transform', 'translate(' + nx + ',' + ny + ')');
      rerouteAll();
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      syncPackages();
      syncBounds();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  // ---------- zoom / pan ----------
  wrap.addEventListener('wheel', function (event) {
    event.preventDefault();
    var rect = wrap.getBoundingClientRect();
    var mx = event.clientX - rect.left;
    var my = event.clientY - rect.top;
    var factor = Math.exp(-event.deltaY * 0.0015);
    var next = Math.min(4, Math.max(0.12, view.scale * factor));
    view.tx = mx - (mx - view.tx) * (next / view.scale);
    view.ty = my - (my - view.ty) * (next / view.scale);
    view.scale = next;
    applyView();
  }, { passive: false });

  wrap.addEventListener('pointerdown', function (event) {
    if (event.target.closest && event.target.closest('[data-expand-toggle]')) return;
    if (event.target.closest && event.target.closest('[data-node]')) return;
    event.preventDefault();
    var startX = event.clientX - view.tx;
    var startY = event.clientY - view.ty;

    function move(moveEvent) {
      view.tx = moveEvent.clientX - startX;
      view.ty = moveEvent.clientY - startY;
      wrap.classList.add('dragging');
      applyView();
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      wrap.classList.remove('dragging');
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  // ---------- highlight ----------
  function clearHighlight() {
    var marked = svg.querySelectorAll('.hl, .dim, .hit');
    for (var i = 0; i < marked.length; i += 1) {
      marked[i].classList.remove('hl');
      marked[i].classList.remove('dim');
      marked[i].classList.remove('hit');
    }
  }

  function highlightNode(node) {
    var id = node.getAttribute('data-node');
    var edges = svg.querySelectorAll('[data-edge]');
    var incident = [];
    for (var e = 0; e < edges.length; e += 1) {
      if (edges[e].getAttribute('data-from') === id || edges[e].getAttribute('data-to') === id) {
        incident.push(edges[e]);
      }
    }
    // Nothing to point at: keep the diagram as is, do not dim the whole canvas.
    if (incident.length === 0) {
      clearHighlight();
      return;
    }

    var near = (node.getAttribute('data-neighbors') || '').split(',').filter(Boolean);
    var keep = {};
    keep[id] = true;
    for (var k = 0; k < near.length; k += 1) keep[near[k]] = true;

    var nodes = svg.querySelectorAll('[data-node]');
    for (var i = 0; i < nodes.length; i += 1) {
      nodes[i].classList.add(keep[nodes[i].getAttribute('data-node')] ? 'hl' : 'dim');
    }
    for (var j = 0; j < edges.length; j += 1) {
      var isIncident = edges[j].getAttribute('data-from') === id || edges[j].getAttribute('data-to') === id;
      edges[j].classList.add(isIncident ? 'hl' : 'dim');
    }
  }

  function markEndRow(nodeId, index) {
    if (!index) return;
    var node = nodeById(nodeId);
    if (!node) return;
    var row = node.querySelector('.member-row[data-member="' + index + '"]');
    if (row) row.classList.add('hl');
  }

  // Only the relation itself lights up: the line, its two ends and their member rows.
  function highlightEdge(edge) {
    var fromId = edge.getAttribute('data-from');
    var toId = edge.getAttribute('data-to');
    var edges = svg.querySelectorAll('[data-edge]');
    for (var i = 0; i < edges.length; i += 1) {
      if (edges[i] === edge) edges[i].classList.add('hl');
      else edges[i].classList.add('dim');
    }
    var nodes = svg.querySelectorAll('g.node');
    for (var j = 0; j < nodes.length; j += 1) {
      var id = nodes[j].getAttribute('data-node');
      nodes[j].classList.add(id === fromId || id === toId ? 'hl' : 'dim');
    }
    markEndRow(fromId, edge.getAttribute('data-from-member'));
    markEndRow(toId, edge.getAttribute('data-to-member'));
  }

  // A member row and its pin are the same thing: both point at the member's relations.
  function highlightMember(row) {
    var node = row.closest('g.node');
    if (!node) return;
    var id = node.getAttribute('data-node');
    var index = row.getAttribute('data-member');
    var keep = {};
    keep[id] = true;
    var peers = [];
    var hits = [];

    var edges = svg.querySelectorAll('[data-edge]');
    for (var i = 0; i < edges.length; i += 1) {
      var edge = edges[i];
      var fromId = edge.getAttribute('data-from');
      var toId = edge.getAttribute('data-to');
      if (fromId === id && edge.getAttribute('data-from-member') === index) {
        hits.push(edge);
        keep[toId] = true;
        peers.push([toId, edge.getAttribute('data-to-member')]);
      } else if (toId === id && edge.getAttribute('data-to-member') === index) {
        hits.push(edge);
        keep[fromId] = true;
        peers.push([fromId, edge.getAttribute('data-from-member')]);
      } else {
        edge.classList.add('dim');
      }
    }

    // No relation behind this member: darken everything exactly like a relation hover does,
    // but without lighting any line up. The class being inspected stays readable.
    if (hits.length === 0) {
      clearHighlight();
      var voidNodes = svg.querySelectorAll('g.node');
      for (var vn = 0; vn < voidNodes.length; vn += 1) {
        if (voidNodes[vn] !== node) voidNodes[vn].classList.add('dim');
      }
      var voidEdges = svg.querySelectorAll('[data-edge]');
      for (var ve = 0; ve < voidEdges.length; ve += 1) voidEdges[ve].classList.add('dim');
      row.classList.add('hl');
      return;
    }
    for (var j = 0; j < hits.length; j += 1) hits[j].classList.add('hl');

    var nodes = svg.querySelectorAll('g.node');
    for (var k = 0; k < nodes.length; k += 1) {
      nodes[k].classList.add(keep[nodes[k].getAttribute('data-node')] ? 'hl' : 'dim');
    }

    row.classList.add('hl');
    for (var m = 0; m < peers.length; m += 1) {
      var peer = nodeById(peers[m][0]);
      var peerIndex = peers[m][1];
      if (!peer || !peerIndex) continue;
      var peerRow = peer.querySelector('.member-row[data-member="' + peerIndex + '"]');
      if (peerRow) peerRow.classList.add('hl');
    }
  }

  function rowFromTarget(target) {
    var row = target.closest && target.closest('.member-row');
    if (row) return row;
    var pin = target.closest && target.closest('.pin-group');
    if (!pin) return null;
    var owner = pin.closest('g.node');
    if (!owner) return null;
    return owner.querySelector('.member-row[data-member="' + pin.getAttribute('data-member') + '"]');
  }

  function anyExpanded() {
    return svg.querySelector('g.node[data-expanded="true"]') !== null;
  }

  svg.addEventListener('mouseover', function (event) {
    // A frozen relation owns the canvas: hover must not override it.
    if (frozenEdge !== null) return;
    var edge = event.target.closest && event.target.closest('.edge');
    if (edge) {
      clearHighlight();
      // Relations light up on direct hover, but only while some class is expanded.
      // Collapsed mode keeps its original behaviour: the class hover shows its links.
      if (!anyExpanded()) return;
      highlightEdge(edge);
      return;
    }
    var row = rowFromTarget(event.target);
    if (row) {
      clearHighlight();
      highlightMember(row);
      return;
    }
    var node = event.target.closest && event.target.closest('g.node');
    if (node) {
      clearHighlight();
      // An expanded class is a container: its box and section titles point at nothing.
      if (node.getAttribute('data-expanded') === 'true') return;
      highlightNode(node);
      return;
    }
    clearHighlight();
  });
  svg.addEventListener('mouseleave', clearHighlight);

  // ---------- expand toggle ----------
  svg.addEventListener('click', function (event) {
    var toggle = event.target.closest && event.target.closest('[data-expand-toggle]');
    if (!toggle) return;
    toggleNode(toggle.closest('[data-node]'));
  });
  svg.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var toggle = event.target.closest && event.target.closest('[data-expand-toggle]');
    if (!toggle) return;
    event.preventDefault();
    toggleNode(toggle.closest('[data-node]'));
  });

  // ---------- freeze a relation ----------
  var frozenEdge = null;
  var unfreezeButton = document.getElementById('unfreeze');

  function setFrozen(edgeId) {
    frozenEdge = edgeId;
    clearHighlight();
    var endpoints = {};
    var edges = svg.querySelectorAll('.edge');
    for (var i = 0; i < edges.length; i += 1) {
      var edge = edges[i];
      var isFrozen = edgeId !== null && edge.getAttribute('data-edge') === edgeId;
      if (isFrozen) {
        endpoints[edge.getAttribute('data-from')] = true;
        endpoints[edge.getAttribute('data-to')] = true;
        edge.classList.add('frozen');
      } else {
        edge.classList.remove('frozen');
      }
    }
    var nodes = svg.querySelectorAll('g.node');
    for (var j = 0; j < nodes.length; j += 1) {
      var nodeId = nodes[j].getAttribute('data-node');
      if (edgeId !== null && endpoints[nodeId]) nodes[j].classList.add('frozen-endpoint');
      else nodes[j].classList.remove('frozen-endpoint');
    }
    if (edgeId !== null) svg.classList.add('has-freeze');
    else svg.classList.remove('has-freeze');
    if (unfreezeButton) {
      if (edgeId !== null) unfreezeButton.removeAttribute('hidden');
      else unfreezeButton.setAttribute('hidden', '');
    }
  }

  // Clicking a relation must not start panning or dragging.
  svg.addEventListener('pointerdown', function (event) {
    if (event.target.closest && event.target.closest('.edge')) event.stopPropagation();
  });

  svg.addEventListener('click', function (event) {
    var edge = event.target.closest && event.target.closest('.edge');
    if (!edge) {
      // A click on the empty canvas releases the frozen relation.
      if (event.target === svg) setFrozen(null);
      return;
    }
    var id = edge.getAttribute('data-edge');
    setFrozen(frozenEdge === id ? null : id);
  });

  if (unfreezeButton) {
    unfreezeButton.addEventListener('click', function () {
      setFrozen(null);
    });
  }

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && frozenEdge !== null) setFrozen(null);
  });

  // ---------- controls ----------
  var search = document.getElementById('q');
  if (search) {
    search.addEventListener('input', function () {
      var query = search.value.trim().toLowerCase();
      var nodes = svg.querySelectorAll('[data-node]');
      if (!query) { clearHighlight(); return; }
      var edges = svg.querySelectorAll('[data-edge]');
      for (var i = 0; i < nodes.length; i += 1) {
        var name = (nodes[i].getAttribute('data-name') || '').toLowerCase();
        var id = (nodes[i].getAttribute('data-node') || '').toLowerCase();
        var hit = name.indexOf(query) !== -1 || id.indexOf(query) !== -1;
        nodes[i].classList.toggle('hit', hit);
        nodes[i].classList.toggle('dim', !hit);
      }
      for (var j = 0; j < edges.length; j += 1) edges[j].classList.add('dim');
    });
  }

  var alpha = document.getElementById('alpha');
  if (alpha) {
    alpha.addEventListener('input', function () {
      document.documentElement.style.setProperty('--class-alpha', alpha.value + '%');
    });
  }

  var expandAll = document.getElementById('expand-all');
  if (expandAll) expandAll.addEventListener('click', function () {
    var nodes = svg.querySelectorAll('[data-node][data-has-members="1"]');
    for (var i = 0; i < nodes.length; i += 1) toggleNode(nodes[i], true);
  });

  var collapseAll = document.getElementById('collapse-all');
  if (collapseAll) collapseAll.addEventListener('click', function () {
    var nodes = svg.querySelectorAll('[data-node][data-expanded="true"]');
    for (var i = 0; i < nodes.length; i += 1) toggleNode(nodes[i], false);
  });

  var theme = document.getElementById('theme');
  if (theme) theme.addEventListener('click', function () {
    var root = document.documentElement;
    root.setAttribute('data-theme', root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  var resetView = document.getElementById('reset');
  if (resetView) resetView.addEventListener('click', fit);

  var legendToggle = document.getElementById('legend-toggle');
  var legend = document.getElementById('legend');
  if (legendToggle && legend) {
    legendToggle.addEventListener('click', function () {
      var open = legend.hasAttribute('hidden');
      if (open) legend.removeAttribute('hidden');
      else legend.setAttribute('hidden', '');
      legendToggle.setAttribute('aria-expanded', String(open));
    });
  }

  var resetLayout = document.getElementById('reset-layout');
  if (resetLayout) resetLayout.addEventListener('click', function () {
    var nodes = svg.querySelectorAll('[data-node]');
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      node.setAttribute('data-x', node.getAttribute('data-orig-x'));
      node.setAttribute('data-y', node.getAttribute('data-orig-y'));
      node.setAttribute('transform', 'translate(' + node.getAttribute('data-orig-x') + ',' + node.getAttribute('data-orig-y') + ')');
    }
    rerouteAll();
    syncPackages();
    syncBounds();
  });

  fit();
  window.addEventListener('resize', fit);
})();
`;

export function renderHtml(spec, svgData) {
  const title = escapeXml(spec.title);
  const stats = `${svgData.stats.classes} классов · ${svgData.stats.relations} связей`;
  return `<!doctype html>
<html lang="ru" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
<header class="bar">
  <div class="title">${title}</div>
  <div class="meta">${stats}</div>
  <div class="spacer"></div>
  <input id="q" class="search" type="search" placeholder="Поиск класса…" aria-label="Поиск класса">
  <label class="slider">заливка <input id="alpha" type="range" min="0" max="80" value="26" aria-label="Прозрачность заливки классов"></label>
  <button id="expand-all" type="button">Развернуть все</button>
  <button id="collapse-all" type="button">Свернуть все</button>
  <button id="theme" type="button" aria-label="Переключить тему">Тема</button>
  <button id="unfreeze" type="button" hidden>Снять закрепление</button>
  <button id="legend-toggle" type="button" aria-expanded="false">Легенда</button>
  <button id="reset-layout" type="button">Раскладка</button>
  <button id="reset" type="button">Вид</button>
</header>
<div id="wrap">
  ${svgData.svg}
  <div class="hint">Класс можно перетащить. Наведите на поле или метод — подсветится его связь. Стрелка внизу раскрывает детали.</div>
  <div id="legend" class="legend" hidden>
    <h4>Обозначения</h4>
    <div class="legend-row">
      <svg width="58" height="16" viewBox="0 0 58 16" aria-hidden="true">
        <line x1="2" y1="8" x2="42" y2="8" stroke="currentColor" stroke-width="1.6"/>
        <polygon points="56,8 42,3 42,13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>
      <span>сплошная + полый треугольник — наследование</span>
    </div>
    <div class="legend-row">
      <svg width="58" height="16" viewBox="0 0 58 16" aria-hidden="true">
        <line x1="2" y1="8" x2="42" y2="8" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4"/>
        <polygon points="56,8 42,3 42,13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>
      <span>пунктир + полый треугольник — реализация интерфейса</span>
    </div>
    <div class="legend-row">
      <svg width="58" height="16" viewBox="0 0 58 16" aria-hidden="true">
        <line x1="2" y1="8" x2="44" y2="8" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4"/>
        <path d="M 44 3 L 56 8 L 44 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>пунктир + стрелка — зависимость (вызов, использование)</span>
    </div>
    <div class="legend-row">
      <svg width="58" height="16" viewBox="0 0 58 16" aria-hidden="true">
        <line x1="2" y1="8" x2="44" y2="8" stroke="currentColor" stroke-width="1.6"/>
        <path d="M 44 3 L 56 8 L 44 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>сплошная + стрелка — ассоциация, композиция, агрегация</span>
    </div>
    <div class="legend-note">Цвет линии — градиент от цвета класса-источника к цвету класса-цели. Ромбов нет: композиция и агрегация рисуются обычной стрелкой.</div>
  </div>
</div>
<script>${CLIENT}</script>
</body>
</html>
`;
}
