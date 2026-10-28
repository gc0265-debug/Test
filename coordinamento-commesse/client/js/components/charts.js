// Grafici minimi in SVG puro, senza libreria — barChart (percentuali) e
// pieChart (valori), usati dalla pagina Lavorazioni. items: [{label, value, color}].

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

export function barChart(items, { width = 320 } = {}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const barH = 20, gap = 12, labelW = 92, valueW = 42;
  const barMaxW = width - labelW - valueW;
  const height = items.length * (barH + gap);
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height: `${height}` });

  items.forEach((it, i) => {
    const y = i * (barH + gap);
    const pct = total ? it.value / total : 0;
    const w = Math.max(total ? 2 : 0, pct * barMaxW);

    const label = svgEl('text', { x: 0, y: y + barH * 0.68, style: 'font-size:10.5px;fill:var(--ink-2);font-family:inherit' });
    label.textContent = it.label;
    svg.appendChild(label);

    svg.appendChild(svgEl('rect', { x: labelW, y, width: barMaxW, height: barH, style: 'fill:var(--paper-3)' }));
    if (w > 0) svg.appendChild(svgEl('rect', { x: labelW, y, width: w, height: barH, style: `fill:${it.color}` }));

    const valueText = svgEl('text', {
      x: labelW + barMaxW + 8, y: y + barH * 0.68,
      style: 'font-size:10.5px;fill:var(--ink);font-weight:600;font-family:inherit',
    });
    valueText.textContent = `${Math.round(pct * 100)}%`;
    svg.appendChild(valueText);
  });
  return svg;
}

export function pieChart(items, { size = 140 } = {}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = size / 2 - 4, cx = size / 2, cy = size / 2;
  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, width: `${size}`, height: `${size}` });

  if (!total) {
    svg.appendChild(svgEl('circle', { cx, cy, r, style: 'fill:var(--paper-3)' }));
    return svg;
  }

  let angle = -Math.PI / 2;
  items.filter((it) => it.value > 0).forEach((it) => {
    const frac = it.value / total;
    const next = angle + frac * Math.PI * 2;
    if (frac >= 0.9999) {
      svg.appendChild(svgEl('circle', { cx, cy, r, style: `fill:${it.color}` }));
    } else {
      const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(next), y2 = cy + r * Math.sin(next);
      const largeArc = next - angle > Math.PI ? 1 : 0;
      svg.appendChild(svgEl('path', {
        d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        style: `fill:${it.color}`,
      }));
    }
    angle = next;
  });
  return svg;
}
