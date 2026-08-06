import { expect, test } from 'vitest';
import {
  workspaceSetupChecklistAccentBorderStyle,
  workspaceSetupChecklistPanelClassName,
  workspaceSetupChecklistRootClassName,
  workspaceSetupChecklistTriggerClassName,
} from './workspaceSetupChecklistLayout';

test('getting started trigger stays distinct from muted sidebar chrome', () => {
  expect(workspaceSetupChecklistRootClassName).toContain('group-data-[collapsible=icon]:hidden');
  expect(workspaceSetupChecklistRootClassName).toContain('pt-[0.1125rem]');
  expect(workspaceSetupChecklistRootClassName).toContain('pb-[0.45rem]');
  expect(workspaceSetupChecklistTriggerClassName).toContain('rounded-full');
  expect(workspaceSetupChecklistTriggerClassName).toContain('bg-background');
  expect(workspaceSetupChecklistTriggerClassName).toContain('items-center');
  expect(workspaceSetupChecklistTriggerClassName).toContain('justify-between');
  expect(workspaceSetupChecklistTriggerClassName).toContain('leading-none');
  expect(workspaceSetupChecklistTriggerClassName).toContain('pl-3.5');
  expect(workspaceSetupChecklistTriggerClassName).toContain('pr-5');
  expect(workspaceSetupChecklistTriggerClassName).toContain('overflow-visible');
  expect(workspaceSetupChecklistTriggerClassName).toContain('h-9');
  expect(workspaceSetupChecklistTriggerClassName).toContain('text-[0.7875rem]');
  expect(workspaceSetupChecklistTriggerClassName).toContain('shadow-none');
  expect(workspaceSetupChecklistTriggerClassName).not.toContain('bg-muted');
  expect(workspaceSetupChecklistAccentBorderStyle.background).toContain('linear-gradient(135deg');
});

test('starter guide panel opens above the footer trigger', () => {
  expect(workspaceSetupChecklistPanelClassName).toContain('absolute');
  expect(workspaceSetupChecklistPanelClassName).toContain('bottom-full');
  expect(workspaceSetupChecklistPanelClassName).toContain('mb-2');
});
