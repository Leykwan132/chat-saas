import { isValidElement, type ReactNode } from 'react';
import { expect, test, vi } from 'vitest';
import QuickRepliesPage from '@/pages/QuickRepliesPage';
import { QuickReplyEditorDialog } from './QuickReplyEditorDialog';
import { QuickReplyDeleteDialog } from './QuickReplyDeleteDialog';
import type { QuickRepliesEditor } from './useQuickRepliesEditor';

const state = vi.hoisted(() => ({ editor: {} as QuickRepliesEditor }));
vi.mock('./useQuickRepliesEditor', () => ({ useQuickRepliesEditor: () => state.editor }));

function elements(node: ReactNode): Array<React.ReactElement<Record<string, unknown>>> {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children as ReactNode)];
}

function setup() {
  const reply = { _id: 'reply', title: 'Greeting', text: 'Hello' };
  state.editor = {
    quickReplies: [reply], filteredReplies: [reply], canManage: true,
    editingReply: reply, isDialogOpen: true, attachments: [], title: 'Greeting', text: 'Hello',
    openEditDialog: vi.fn(), setDeletingReply: vi.fn(), setIsDialogOpen: vi.fn(),
    handleDelete: vi.fn(), isDeleting: false,
  } as unknown as QuickRepliesEditor;
  return state.editor;
}

test('clicking the reply card opens editing without separate card actions', () => {
  const editor = setup();
  const nodes = elements(QuickRepliesPage());
  const card = nodes.find((node) => node.type === 'button' && node.key === 'reply');
  expect(card).toBeDefined();
  (card?.props.onClick as () => void)();
  expect(editor.openEditDialog).toHaveBeenCalledWith(editor.editingReply);
  expect(nodes.some((node) => node.props.title === 'Delete')).toBe(false);
});

test('delete is available in the edit modal and absent when creating', () => {
  const editor = setup();
  const deletion = elements(QuickReplyEditorDialog({ editor })).find((node) => node.props['aria-label'] === 'Delete quick reply');
  expect(deletion?.props.variant).toBe('destructiveGhost');
  (deletion?.props.onClick as () => void)();
  expect(editor.setDeletingReply).toHaveBeenCalledWith(editor.editingReply);
  editor.editingReply = null;
  expect(elements(QuickReplyEditorDialog({ editor })).some((node) => node.props['aria-label'] === 'Delete quick reply')).toBe(false);
});

test('pending deletion cannot dismiss its confirmation', () => {
  const editor = setup();
  editor.isDeleting = true;
  const dialog = QuickReplyDeleteDialog({ editor });
  dialog.props.onOpenChange(false);
  expect(editor.setDeletingReply).not.toHaveBeenCalled();
  const buttons = elements(dialog).filter((node) => node.props.variant === 'ghost' || node.props.variant === 'destructive');
  expect(buttons.every((node) => node.props.disabled === true)).toBe(true);
});
