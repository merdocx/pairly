#!/usr/bin/env node
/**
 * Выгрузка текстов и токенов из Figma по файлу дизайна.
 * Токен: переменная окружения FIGMA_ACCESS_TOKEN (не хранить в репозитории).
 *
 * Запуск:
 *   FIGMA_ACCESS_TOKEN=your_token node design/fetch-figma.mjs
 * или из корня: cd /root/pairly && FIGMA_ACCESS_TOKEN=xxx node design/fetch-figma.mjs
 *
 * Figma file key из URL: .../design/FILE_KEY/...
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

function collectFills(node, list = [], path = '') {
  const name = node.name || '';
  const p = path ? `${path} > ${name}` : name;
  if (node.fills && Array.isArray(node.fills)) {
    for (const f of node.fills) {
      if (f.type === 'SOLID' && f.color) {
        const { r, g, b, a = 1 } = f.color;
        const hex = [r, g, b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
        list.push({ path: p, hex: `#${hex}`, opacity: a });
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

async function main() {
  const fs = await import('fs');
  const path = await import('path');
  const __dirname = path.dirname(new URL(import.meta.url).pathname);

  console.log('Загрузка файла Figma...');
  const file = await fetchFigma(`/files/${FIGMA_FILE_KEY}`);
  const doc = file.document;

  const texts = collectTexts(doc);
  const fills = collectFills(doc);

  const outDir = __dirname;
  const textsPath = path.join(outDir, 'figma-texts.json');
  const exportPath = path.join(outDir, 'figma-export.json');

  fs.writeFileSync(textsPath, JSON.stringify({ texts, exportedAt: new Date().toISOString() }, null, 2), 'utf8');
  console.log('Тексты записаны:', textsPath, `(${texts.length} строк)`);

  const uniqueColors = [...new Map(fills.map((f) => [f.hex, f])).values()];
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
  console.log('Полный экспорт (документ + тексты + цвета):', exportPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
