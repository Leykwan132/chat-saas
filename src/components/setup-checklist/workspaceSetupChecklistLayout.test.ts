import { expect, test } from 'vitest';
import {
  workspaceSetupChecklistPanelClassName,
  workspaceSetupChecklistRootClassName,
  workspaceSetupChecklistTriggerClassName,
} from './workspaceSetupChecklistLayout';

test('launch guide trigger is styled as a sidebar footer pill', () => {
  expect(workspaceSetupChecklistRootClassName).toContain('group-data-[collapsible=icon]:hidden');
  expect(workspaceSetupChecklistRootClassName).toContain('pt-[0.1125rem]');
  expect(workspaceSetupChecklistRootClassName).toContain('pb-[0.45rem]');
  expect(workspaceSetupChecklistTriggerClassName).toContain('rounded-full');
  expect(workspaceSetupChecklistTriggerClassName).toContain('h-9');
});

test('launch guide panel opens above the footer trigger', () => {
  expect(workspaceSetupChecklistPanelClassName).toContain('absolute');
  expect(workspaceSetupChecklistPanelClassName).toContain('bottom-full');
  expect(workspaceSetupChecklistPanelClassName).toContain('mb-2');
});
