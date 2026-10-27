// Keep the generated Dean DH navigation consistent with its adviser and Dean pages.
const icons = {
  "Dashboard": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z\"></path></svg>",
  "Advisees": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12.6 8a3.6 3.6 0 1 1-7.2 0 3.6 3.6 0 0 1 7.2 0M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.6 3.6 0 0 1 0 5.6M17.5 20a6.6 6.6 0 0 0-2.2-4.9\"></path></svg>",
  "Encode grades": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4\"></path></svg>",
  "Import grades": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3\"></path></svg>",
  "Grade flags": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5.5 21V3.5M5.5 4.5h12l-2.4 4 2.4 4h-12\"></path></svg>",
  "Faculty reports": "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.55\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 3v18h18M9 17v-5m5 5V7m5 10V4\"></path></svg>",
  "Students": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12.6 8a3.6 3.6 0 1 1-7.2 0 3.6 3.6 0 0 1 7.2 0M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.6 3.6 0 0 1 0 5.6M17.5 20a6.6 6.6 0 0 0-2.2-4.9\"></path></svg>",
  "Audit log": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 3h12v18H6zM9 7h6m-6 5h6m-6 5h4\"></path></svg>",
  "Curriculum transfers": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4\"></path></svg>",
  "Curricula": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13\"></path></svg>",
  "Equivalence": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m10 13 4-4M8 15l-2 2a4 4 0 0 1-5-5l4-4a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 5l-4 4a4 4 0 0 1-6 0\"></path></svg>",
  "Outside credits": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 4h16v16H4zM8 9h8m-8 4h4m2 3 2 2 4-4\"></path></svg>",
  "Adviser assignments": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 8h13l-3.5-3.5M20 16H7l3.5 3.5\"></path></svg>",
  "Academic terms": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 5h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5zM3.5 10h17M8 3v4M16 3v4\"></path></svg>",
  "Department reports": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 3v18h18M9 17v-5m5 5V7m5 10V4\"></path></svg>",
  "Settings": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 2h6l1 4 4 1 2 5-3 3v5l-5 2-3-3H6l-4-5 3-3V6z\"></path></svg>",
  "Advisee reports": "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.55\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 3v18h18M9 17v-5m5 5V7m5 10V4\"></path></svg>"
};
module.exports = function navigation(html, file) {
 if (html.includes('class="dean-role-navigation"')) return html;
 html = html.replace(/<aside([^>]*)>/, (_, attrs) => attrs.includes('class=')
  ? '<aside' + attrs.replace(/class="([^"]*)"/, 'class="$1 dean-dh-sidebar"') + '>'
  : '<aside class="dean-dh-sidebar"' + attrs + '>');
 const start = html.indexOf('<aside'), end = html.indexOf('</aside>', start);
 if (start < 0) return html;
 const aside = html.slice(start, end), match = aside.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/);
 if (!match) throw new Error(file + ': sidebar navigation missing');
 const groups = [[], [], []];
 for (const anchor of match[0].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
  const attrs = anchor[1], inner = anchor[2];
  const href = attrs.match(/href="([^"]*)"/)[1];
  const title = inner.replace(/<svg\b[\s\S]*?<\/svg>/g, '').replace(/<[^>]*>/g, '').trim()
   .replace('My advisees', 'Advisees').replace('Import grades (JSON)', 'Import grades');
  if (!icons[title]) throw new Error(file + ': missing icon for ' + title);
  const bar = inner.match(/<span\b[^>]*data-bar[^>]*>[\s\S]*?<\/span>/);
  const link = '<a' + attrs + '>' + (bar ? bar[0] : '') + icons[title] + '<span>' + title + '</span></a>';
  const group = href.startsWith('#') || /^DHAdviser(?!Assignments)/.test(href) ? 0 : href.startsWith('DHDean') ? 2 : 1;
  groups[group].push(link);
 }
 const active = /^DHDean/.test(file) ? 2 : /^DHAdvisee/.test(file) || /^DHAdviser(?!Assignments)/.test(file) ? 0 : 1;
 const titles = ['Adviser', 'Department Head', 'Dean'];
 const nav = '<nav class="dean-role-navigation" aria-label="Dean department head navigation">' + groups.map((links, index) =>
  '<details class="dean-role-section"' + (index === active ? ' open' : '') + '><summary class="dean-role-label">' + titles[index] + '</summary><div class="dean-role-links">' + links.join('') + '</div></details>'
 ).join('') + '</nav>';
 return html.slice(0, start) + aside.replace(match[0], nav) + html.slice(end);
};
