import { expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import panelSource from './KnowledgeBaseStoragePanel.tsx?raw';
import pageSource from '../../pages/KnowledgeBasePage.tsx?raw';
import { KnowledgeBaseStoragePanel } from './KnowledgeBaseStoragePanel';

test('storage limit rows can switch knowledge base tabs', () => {
  expect(panelSource).toContain('type: KnowledgeType');
  expect(panelSource).toContain('onSelect: (type: KnowledgeType) => void');
  expect(panelSource).toContain('onClick={() => onSelect(type)}');
  expect(panelSource).toContain('<button');
  expect(panelSource).toContain('type="button"');
});

test('knowledge base page wires storage limit rows to the same tab navigation', () => {
  expect(pageSource).toContain("type: 'web'");
  expect(pageSource).toContain("type: 'file'");
  expect(pageSource).toContain("type: 'text'");
  expect(pageSource).toContain("type: 'qa'");
  expect(pageSource).toContain('onSelect={selectKnowledgeType}');
  expect(pageSource).toContain('navigate(`/dashboard/${agentId}/knowledge-base/${nextType}`)');
});

test('leaves clear space between storage usage and the training status pill', () => {
  const markup = renderToStaticMarkup(
    createElement(KnowledgeBaseStoragePanel, {
      rows: [],
      totalFileSize: 0,
      maxTotalSize: 1,
      trainingItemCount: 0,
      onSelect: () => undefined,
      onTest: () => undefined,
    }),
  );

  expect(markup).toContain('class="mt-2"');
});
