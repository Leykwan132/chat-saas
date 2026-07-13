import { expect, test } from 'vitest';
import { WORKFLOW_TEMPLATES } from './workflowTemplates';

test('starter templates contain explicit actions without answer-questions nodes', () => {
  expect(WORKFLOW_TEMPLATES.map((template) => template.name)).toEqual([
    'Q&A',
    'Real Estate',
    'E-commerce Product',
  ]);
  for (const template of WORKFLOW_TEMPLATES) {
    expect(template.graph.workflow.layoutOrientation).toBe('horizontal');
    const kinds = template.graph.nodes.map((node) => node.kind);
    expect(kinds).not.toContain('answerQuestions');
    expect(kinds).not.toContain('sendText');
    expect(kinds).toContain('sendFile');
    expect(kinds).toContain('bookAppointment');
    expect(kinds).toContain('humanEscalation');
  }
  expect(WORKFLOW_TEMPLATES[1].graph.nodes.map((node) => node.kind)).toContain('sendImage');
  expect(WORKFLOW_TEMPLATES[2].graph.nodes.map((node) => node.kind)).toContain('sendImage');
});

test('starter templates use intentional customer-routing conditions', () => {
  expect(WORKFLOW_TEMPLATES.map((template) => template.graph.edges.map((edge) => edge.label))).toEqual([
    ['Needs supporting material', 'Ready to book', 'Needs human help'],
    ['Requests property photos', 'Requests property documents', 'Ready to view', 'Needs a property agent'],
    ['Requests product images', 'Requests a product guide', 'Wants a consultation', 'Needs sales help'],
  ]);
  for (const template of WORKFLOW_TEMPLATES) {
    expect(template.graph.edges.every((edge) => Boolean(edge.detail?.trim()))).toBe(true);
  }
});

test('starter template actions have room for nodes and condition labels', () => {
  for (const template of WORKFLOW_TEMPLATES) {
    const actionYPositions = template.graph.nodes
      .filter((node) => node.kind !== 'start')
      .map((node) => node.positionY)
      .sort((a, b) => a - b);
    for (let index = 1; index < actionYPositions.length; index += 1) {
      expect(actionYPositions[index] - actionYPositions[index - 1]).toBeGreaterThanOrEqual(200);
    }
  }
});
