import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const actionsSource = readFileSync(new URL('./WorkflowDraftActions.tsx', import.meta.url), 'utf8');
const templateSource = readFileSync(new URL('./WorkflowTemplateHoverCard.tsx', import.meta.url), 'utf8');
const toolbarSource = readFileSync(new URL('./WorkflowToolbar.tsx', import.meta.url), 'utf8');

test('shows primary Save and destructive Discard changes actions only for dirty drafts', () => {
  expect(actionsSource).toContain('if (!isDirty) return null');
  expect(actionsSource).toContain('position="top-right"');
  expect(actionsSource).toContain('rounded-lg border border-border bg-background/95 p-1 backdrop-blur');
  expect(actionsSource).toContain("import { Loader2, Save, Trash2 } from 'lucide-react'");
  expect(actionsSource).toContain('variant="destructiveGhost"');
  expect(actionsSource).not.toContain('variant="destructive"');
  expect(actionsSource).toContain('<Trash2 data-icon="inline-start" />');
  expect(actionsSource).toContain('Discard changes');
  expect(actionsSource).not.toContain('RotateCcw');
  expect(actionsSource).toContain('Save');
  expect(actionsSource).not.toContain('variant="ghost" size="sm" disabled={isSaving} onClick={onSave}');
  expect(toolbarSource).not.toContain('text-destructive');
});

test('uses fully clickable horizontal template cards with Preview cues', () => {
  expect(templateSource).toContain('side="top"');
  expect(templateSource).toContain('CardFooter');
  expect(templateSource).toContain('grid grid-cols-3 gap-3');
  expect(templateSource).toContain('w-[min(33.6rem,calc(100vw-2rem))]');
  expect(templateSource).toContain("import { Eye, LayoutTemplate } from 'lucide-react'");
  expect(templateSource).toContain('role="button"');
  expect(templateSource).toContain('tabIndex={0}');
  expect(templateSource).toContain('onClick={() => previewTemplate(template)}');
  expect(templateSource).toContain('onKeyDown={(event) => handleTemplateKeyDown(event, template)}');
  expect(templateSource).toContain('Preview');
  expect(templateSource).not.toContain('Try now');
  expect(templateSource).toContain('<Eye data-icon="inline-start" />');
  expect(templateSource).toContain('aria-label={`Preview ${template.name} template`}');
  expect(templateSource).not.toContain('Replace current');
  expect(templateSource).not.toContain('Message enters');
  expect(templateSource).not.toContain('template.graph.nodes.length');
  expect(templateSource).toContain('onClick={() => setOpen(true)}');
  expect(toolbarSource.indexOf('WorkflowTemplateHoverCard')).toBeLessThan(toolbarSource.indexOf('onClick={onArrange}'));
});
