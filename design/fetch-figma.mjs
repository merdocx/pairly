#!/usr/bin/env node
/**
 * Выгрузка из Figma и полная сверка с кодом: тексты, цвета, типографика, размеры/расположение.
 * Токен: FIGMA_ACCESS_TOKEN (не хранить в репозитории).
 *
 * Шаг 1 — выгрузка из Figma:
 *   - Тексты (TEXT): путь, строка, стиль (fontSize, fontWeight и т.д.).
 *   - Цвета: SOLID fills и градиенты (путь, HEX).
 *   - Типографика: уникальные fontFamily + fontSize + fontWeight.
 *   - Layout: у всех узлов с absoluteBoundingBox — path, name, type, width, height, x, y, cornerRadius.
 *   - Иконки: узлы VECTOR и FRAME/COMPONENT с именем Icon или Logo (path, name, width, height).
 *
 * Шаг 2 — сверка с кодом (compare-figma.mjs):
 *   - Цвета, размеры, типографика: :root и ключевые px vs Figma.
 *   - Иконки: BottomNav, Logo, размер 24×24 vs иконки в коде.
 *
 * Запуск:
 *   FIGMA_ACCESS_TOKEN=xxx node design/fetch-figma.mjs
 *   node design/compare-figma.mjs   # после выгрузки
 * Или одной командой (fetch + compare): node design/fetch-figma.mjs && node design/compare-figma.mjs
 */

const FIGMA_FILE_KEY = 'OeztMeyJkgc6hbFlWNBRSm';
const BASE = 'https://api.figma.com/v1';

async function fetchFigma(endpoint) {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    console.error('Задайте FIGMA_ACCESS_TOKEN в окружении');
    process.exit(1);
  }
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'X-Figma-Token': token },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Figma API ${res.status}: ${t}`);
  }
  return res.json();
}

function collectTexts(node, list = [], path = '') {
  const name = node.name || '';
  const p = path ? `${path} > ${name}` : name;
  if (node.type === 'TEXT' && node.characters) {
    list.push({ path: p, text: node.characters.trim(), style: node.style });
  }
  if (node.children) {
    for (const child of node.children) {
      collectTexts(child, list, p);
    }
  }
  return list;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => Math.round((x ?? 0) * 255).toString(16).padStart(2, '0')).join('');
}

function collectFills(node, list = [], path = '') {
  const name = node.name || '';
  const p = path ? `${path} > ${name}` : name;
  if (node.fills && Array.isArray(node.fills)) {
    for (const f of node.fills) {
      if (f.type === 'SOLID' && f.color) {
        const { r, g, b, a = 1 } = f.color;
        list.push({ path: p, hex: rgbToHex(r, g, b), opacity: a });
      } else if (
        (f.type === 'GRADIENT_LINEAR' || f.type === 'GRADIENT_RADIAL') &&
        f.gradientStops &&
        Array.isArray(f.gradientStops)
      ) {
        for (const stop of f.gradientStops) {
          if (stop.color) {
            const { r, g, b, a = 1 } = stop.color;
            list.push({ path: p, hex: rgbToHex(r, g, b), opacity: a });
          }
        }
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      collectFills(child, list, p);
    }
  }
  return list;
}

function collectLayout(node, list = [], path = '') {
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
      x: Math.round(box.x),
      y: Math.round(box.y),
      cornerRadius: node.cornerRadius ?? node.rectangleCornerRadii ?? null,
    });
  }
  if (node.children) {
    for (const child of node.children) {
      collectLayout(child, list, p);
    }
  }
  return list;
}

function collectTypography(texts) {
  const seen = new Map();
  for (const t of texts) {
    if (!t.style) continue;
    const { fontFamily, fontSize, fontWeight } = t.style;
    const key = `${fontFamily}|${fontSize}|${fontWeight}`;
    if (!seen.has(key)) {
      seen.set(key, { fontFamily: fontFamily || 'Inter', fontSize, fontWeight, path: t.path });
    }
  }
  return [...seen.values()];
}

function collectIcons(node, list = [], path = '') {
  const name = node.name || '';
  const p = path ? `${path} > ${name}` : name;
  const box = node.absoluteBoundingBox || node.absoluteBounding;
  const isIconLike =
    node.type === 'VECTOR' ||
    (node.type === 'COMPONENT' && (name === 'Icon' || name === 'Logo' || name.includes('icon'))) ||
    (node.type === 'FRAME' && (name === 'Icon' || name === 'Logo'));
  if (isIconLike && box && typeof box.width === 'number' && typeof box.height === 'number') {
    list.push({
      path: p,
      name,
      type: node.type,
      width: Math.round(box.width),
      height: Math.round(box.height),
    });
  }
  if (node.children) {
    for (const child of node.children) {
      collectIcons(child, list, p);
    }
  }
  return list;
}

async function main() {
  const fs = await import('fs');
  const path = await import('path');
  const __dirname = path.dirname(new URL(import.meta.url).pathname);

  console.log('Загрузка файла Figma...');
  const file = await fetchFigma(`/files/${FIGMA_FILE_KEY}`);
  const doc = file.document;

  const texts = collectTexts(doc);
  const fills = collectFills(doc);
  const layout = collectLayout(doc);
  const typography = collectTypography(texts);
  const icons = collectIcons(doc);

  const uniqueColors = [...new Map(fills.map((f) => [f.hex, f])).values()];

  const outDir = __dirname;
  const textsPath = path.join(outDir, 'figma-texts.json');
  const exportPath = path.join(outDir, 'figma-export.json');
  const specPath = path.join(outDir, 'figma-spec.json');

  fs.writeFileSync(textsPath, JSON.stringify({ texts, exportedAt: new Date().toISOString() }, null, 2), 'utf8');
  console.log('Тексты записаны:', textsPath, `(${texts.length} строк)`);

  fs.writeFileSync(
    exportPath,
    JSON.stringify(
      {
        name: file.name,
        lastModified: file.lastModified,
        exportedAt: new Date().toISOString(),
        texts,
        colors: uniqueColors,
        document: doc,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log('Полный экспорт:', exportPath);

  const spec = {
    exportedAt: new Date().toISOString(),
    lastModified: file.lastModified,
    colors: uniqueColors.map((c) => ({ hex: c.hex, opacity: c.opacity, path: c.path })),
    typography,
    layout,
    icons,
    textsCount: texts.length,
  };
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf8');
  console.log('Спека для сверки:', specPath, `(layout: ${layout.length}, иконки: ${icons.length}, типографика: ${typography.length})`);

  // Запуск сверки с кодом (цвета, размеры, типографика)
  const { spawn } = await import('child_process');
  const comparePath = path.join(outDir, 'compare-figma.mjs');
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [comparePath], {
      cwd: path.resolve(outDir, '..'),
      stdio: 'inherit',
    });
    child.on('close', () => resolve());
    child.on('error', () => resolve());
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
