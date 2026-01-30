#!/usr/bin/env node
/**
 * Сверка выгруженного Figma (figma-spec.json) с кодом (globals.css).
 * Запускать после fetch-figma.mjs.
 *
 * Сравнивает:
 *   - Цвета: переменные :root и все HEX в CSS vs цвета из Figma.
 *   - Размеры: --app-max, --container-padding и ключевые px vs узлы Figma (width/height).
 *   - Типографика: размеры шрифтов в CSS (24, 16, 14, 12) vs Figma.
 *
 * Запуск: node design/compare-figma.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const designDir = __dirname;
const rootDir = path.resolve(designDir, '..');
const globalsPath = path.join(rootDir, 'web', 'src', 'app', 'globals.css');
const specPath = path.join(designDir, 'figma-spec.json');

function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return '';
  const m = hex.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return '';
  let s = m[1];
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return '#' + s.toLowerCase();
}

function parseRootVars(css) {
  const map = {};
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/s);
  if (!rootMatch) return map;
  const block = rootMatch[1];
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

function extractHexColors(css) {
  const set = new Set();
  const re = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    set.add(normalizeHex('#' + m[1]));
  }
  return set;
}

function extractPxValues(css) {
  const set = new Set();
  const re = /(\d+)px/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    set.add(parseInt(m[1], 10));
  }
  return set;
}

function collectLayoutFromDoc(node, list = [], path = '') {
  const name = node.name || '';
  const p = path ? `${path} > ${name}` : name;
  const box = node.absoluteBoundingBox || node.absoluteBounding;
  if (box && typeof box.width === 'number' && typeof box.height === 'number') {
    list.push({
      path: p,
      name,
      type: node.type,
      width: Math.round(box.width),
      height: Math.round(box.height),
      cornerRadius: node.cornerRadius ?? node.rectangleCornerRadii ?? null,
    });
  }
  if (node.children) {
    for (const child of node.children) {
      collectLayoutFromDoc(child, list, p);
    }
  }
  return list;
}

function collectIconsFromDoc(node, list = [], path = '') {
  const name = node.name || '';
  const p = path ? `${path} > ${name}` : name;
  const box = node.absoluteBoundingBox || node.absoluteBounding;
  const isIconLike =
    node.type === 'VECTOR' ||
    (node.type === 'COMPONENT' && (name === 'Icon' || name === 'Logo' || (name && name.toLowerCase().includes('icon')))) ||
    (node.type === 'FRAME' && (name === 'Icon' || name === 'Logo'));
  if (isIconLike && box && typeof box.width === 'number' && typeof box.height === 'number') {
    list.push({ path: p, name, type: node.type, width: Math.round(box.width), height: Math.round(box.height) });
  }
  if (node.children) {
    for (const child of node.children) {
      collectIconsFromDoc(child, list, p);
    }
  }
  return list;
}

function buildSpecFromExport(exportData) {
  const layout = exportData.document ? collectLayoutFromDoc(exportData.document) : [];
  const icons = exportData.document ? collectIconsFromDoc(exportData.document) : [];
  const typography = [];
  const seen = new Map();
  for (const t of exportData.texts || []) {
    if (!t.style) continue;
    const { fontFamily, fontSize, fontWeight } = t.style;
    const key = `${fontFamily}|${fontSize}|${fontWeight}`;
    if (!seen.has(key)) {
      seen.set(key, { fontFamily: fontFamily || 'Inter', fontSize, fontWeight, path: t.path });
    }
  }
  return {
    colors: exportData.colors || [],
    typography: [...seen.values()],
    layout,
    icons,
  };
}

function main() {
  if (!fs.existsSync(globalsPath)) {
    console.error('Не найден globals.css:', globalsPath);
    process.exit(1);
  }

  let spec;
  if (fs.existsSync(specPath)) {
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } else {
    const exportPath = path.join(designDir, 'figma-export.json');
    if (!fs.existsSync(exportPath)) {
      console.error('Сначала запустите выгрузку: FIGMA_ACCESS_TOKEN=xxx node design/fetch-figma.mjs');
      process.exit(1);
    }
    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    spec = buildSpecFromExport(exportData);
    console.log('Используется figma-export.json (figma-spec.json не найден).');
  }
  const css = fs.readFileSync(globalsPath, 'utf8');

  const rootVars = parseRootVars(css);
  const ourHexes = extractHexColors(css);
  const ourPx = extractPxValues(css);

  const figmaHexes = new Set((spec.colors || []).map((c) => normalizeHex(c.hex)));
  const figmaLayout = spec.layout || [];
  const figmaIcons = spec.icons || [];
  const figmaTypography = spec.typography || [];
  const figmaFontSizes = new Set(figmaTypography.map((t) => t.fontSize).filter(Boolean));
  const figmaWidths = new Set(figmaLayout.map((n) => n.width));
  const figmaHeights = new Set(figmaLayout.map((n) => n.height));

  const figmaNavIcons = figmaIcons.filter((i) => i.path.includes('BottomNav'));
  const figmaLogoNodes = figmaIcons.filter((i) => i.name === 'Logo' || i.path.includes('Logo'));

  const report = [];
  let hasError = false;

  // —— Цвета ——
  const colorVars = [
    'bg',
    'bg-alt',
    'surface',
    'surface-alt',
    'text',
    'text-secondary',
    'muted',
    'accent',
    'accent-hover',
    'accent-end',
    'border',
    'error',
  ];
  const gradientOrSpecialVars = ['accent-end']; // могут быть в градиенте Figma (не SOLID)
  for (const v of colorVars) {
    const key = '--' + v;
    const val = rootVars[v];
    if (!val) {
      report.push({ section: 'Цвета', check: key, ok: false, msg: 'нет в :root' });
      hasError = true;
      continue;
    }
    const hex = normalizeHex(val);
    if (!hex) {
      report.push({ section: 'Цвета', check: key, ok: false, msg: `значение не HEX: ${val}` });
      hasError = true;
      continue;
    }
    const inFigma = figmaHexes.has(hex);
    const isGradientVar = gradientOrSpecialVars.includes(v);
    const ok = inFigma || (isGradientVar && ourHexes.has(hex));
    report.push({
      section: 'Цвета',
      check: `${key} = ${hex}`,
      ok,
      msg: inFigma ? 'есть в Figma' : isGradientVar && ourHexes.has(hex) ? 'в коде (градиент); в Figma может быть градиент' : 'нет в выгрузке Figma',
    });
    if (!ok) hasError = true;
  }

  // Доп. цвета из CSS (не переменные), которые должны быть в Figma
  const extraHexInCss = [...ourHexes].filter((h) => !figmaHexes.has(h));
  if (extraHexInCss.length > 0) {
    report.push({
      section: 'Цвета',
      check: 'Цвета только в CSS',
      ok: true,
      msg: `в CSS есть ещё ${extraHexInCss.length} цветов (могут быть кнопки/иконки): ${extraHexInCss.slice(0, 5).join(', ')}${extraHexInCss.length > 5 ? '…' : ''}`,
    });
  }

  // —— Размеры ——
  const appMax = rootVars['app-max'];
  const appMaxPx = appMax ? parseInt(appMax.replace(/px$/, ''), 10) : null;
  if (appMaxPx != null) {
    const inFigma = figmaWidths.has(appMaxPx) || figmaLayout.some((n) => Math.abs(n.width - appMaxPx) <= 2);
    report.push({
      section: 'Размеры',
      check: `--app-max = ${appMaxPx}px`,
      ok: inFigma,
      msg: inFigma ? 'есть в Figma (ширина узла)' : `в Figma нет узла с width ≈ ${appMaxPx}`,
    });
    if (!inFigma) hasError = true;
  }

  const containerPadding = rootVars['container-padding'];
  const paddingPx = containerPadding ? parseInt(containerPadding.replace(/px$/, ''), 10) : null;
  if (paddingPx != null) {
    const inFigma =
      figmaWidths.has(paddingPx) ||
      figmaHeights.has(paddingPx) ||
      figmaLayout.some((n) => n.width === paddingPx || n.height === paddingPx);
    report.push({
      section: 'Размеры',
      check: `--container-padding = ${paddingPx}px`,
      ok: inFigma,
      msg: inFigma ? 'есть в Figma' : `в Figma нет узла с размером ${paddingPx}`,
    });
    if (!inFigma) hasError = true;
  }

  // Ключевые px из CSS (24, 16, 14, 12) — типографика/отступы
  const keySizes = [24, 16, 14, 12];
  for (const px of keySizes) {
    const inFigma =
      figmaFontSizes.has(px) ||
      figmaLayout.some((n) => n.width === px || n.height === px || n.cornerRadius === px);
    report.push({
      section: 'Размеры/типографика',
      check: `${px}px (в CSS)`,
      ok: inFigma,
      msg: inFigma ? 'есть в Figma' : 'нет в Figma',
    });
    if (!inFigma) hasError = true;
  }

  // —— Типографика ——
  const expectedFontSizes = [30, 24, 16, 14, 12]; // из макета
  for (const size of expectedFontSizes) {
    const inFigma = figmaFontSizes.has(size);
    report.push({
      section: 'Типографика',
      check: `fontSize ${size}px`,
      ok: inFigma,
      msg: inFigma ? 'есть в Figma' : 'нет в Figma',
    });
    if (!inFigma) hasError = true;
  }

  // —— Иконки ——
  const expectedNavIcons = 3; // Что смотреть, Поиск, Профиль
  const navMatch = figmaNavIcons.length >= expectedNavIcons;
  report.push({
    section: 'Иконки',
    check: 'Нижнее меню (BottomNav)',
    ok: navMatch,
    msg: `Figma: ${figmaNavIcons.length} иконок/векторов в BottomNav; в коде: 3 (IconWatch, IconSearch, IconProfile, 24×24)`,
  });
  if (!navMatch) hasError = true;

  const logoMatch = figmaLogoNodes.length > 0;
  report.push({
    section: 'Иконки',
    check: 'Логотип (Logo)',
    ok: logoMatch,
    msg: logoMatch ? `Figma: ${figmaLogoNodes.length} узлов Logo/иконка; в коде: PairlyLogoMark` : 'в Figma нет узла Logo',
  });
  if (!logoMatch) hasError = true;

  const icon24InFigma = figmaIcons.filter((i) => i.width === 24 && i.height === 24).length;
  report.push({
    section: 'Иконки',
    check: 'Размер 24×24 (нав, хедер)',
    ok: icon24InFigma >= 3,
    msg: `Figma: ${icon24InFigma} иконок 24×24; в коде: BottomNav 24×24, хедер лого ~28`,
  });

  const ourIconList =
    'В коде: BottomNav (Watch, Search, Profile), PairlyLogo, EyeIcon, AvatarIcon, HeartIcon, CopyIcon, LeaveIcon, CalendarIcon, ClockIcon, CheckIcon, StarIcon, лупа в поиске.';
  report.push({
    section: 'Иконки',
    check: 'Полный список иконок',
    ok: true,
    msg: `Figma: ${figmaIcons.length} узлов (Icon/Logo/VECTOR). ${ourIconList}`,
  });

  // —— Вывод отчёта ——
  console.log('\n=== Сверка Figma ↔ код (globals.css) ===\n');

  let prevSection = '';
  for (const r of report) {
    if (r.section !== prevSection) {
      console.log(r.section + ':');
      prevSection = r.section;
    }
    const icon = r.ok ? '✅' : '❌';
    console.log(`  ${icon} ${r.check} — ${r.msg}`);
  }

  console.log('\n' + (hasError ? 'Есть расхождения (см. ❌).' : 'Всё совпадает.'));
  process.exit(hasError ? 1 : 0);
}

main();
