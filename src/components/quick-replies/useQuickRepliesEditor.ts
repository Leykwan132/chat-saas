import { useState, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../../../convex/_generated/api';
import { toast } from 'sonner';
import { uploadWithProgress } from '@/lib/r2Upload';

type QuickReply = FunctionReturnType<typeof api.quickReplies.list>[number];

export function useQuickRepliesEditor() {
  const quickReplies = useQuery(api.quickReplies.list);
  const createQuickReply = useMutation(api.quickReplies.create);
  const updateQuickReply = useMutation(api.quickReplies.update);
  const removeQuickReply = useMutation(api.quickReplies.remove);

  const userAccess = useQuery(api.teamAccess.getCurrentUserAccess, {});
  const canManage = userAccess?.role === 'owner' || userAccess?.role === 'admin';

  const generateUploadUrl = useMutation(api.media.r2Client.generateUploadUrl);
  const syncMetadata = useAction(api.media.r2Client.syncMetadata);

  interface MediaAttachment {
    id: string;
    url: string;
    r2Key?: string;
    clientId?: string;
    file?: File;
    isUploading?: boolean;
    progress?: number;
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingReply, setDeletingReply] = useState<QuickReply | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredReplies = useMemo(() => {
    if (!quickReplies) return [];
    return quickReplies.filter(
      (reply) =>
        reply.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reply.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [quickReplies, searchQuery]);

  const openCreateDialog = () => {
    setEditingReply(null);
    setTitle('');
    setText('');
    setAttachments([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (reply: QuickReply) => {
    setEditingReply(reply);
    setTitle(reply.title);
    setText(reply.text);

    const initialAttachments: MediaAttachment[] = [];
    if (reply.imageUrls && reply.imageUrls.length > 0) {
      reply.imageUrls.forEach((url: string, index: number) => {
        const key = reply.r2Keys?.[index] || reply.r2Key;
        if (key) {
          initialAttachments.push({
            id: crypto.randomUUID(),
            url,
            r2Key: key,
          });
        }
      });
    }
    setAttachments(initialAttachments);
    setIsDialogOpen(true);
  };

  const isCurrentlyUploading = attachments.some(att => att.isUploading);

  const uploadSingleFile = async (att: MediaAttachment) => {
    const file = att.file!;
    const clientId = crypto.randomUUID();

    try {
      if (!generateUploadUrl || !syncMetadata) {
        throw new Error('Upload APIs not available');
      }

      const { url, key } = await generateUploadUrl({
        clientId,
        mediaType: file.type,
        filename: file.name,
      });

      await uploadWithProgress(url, file, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setAttachments(prev =>
          prev.map(item =>
            item.id === att.id ? { ...item, progress: pct } : item
          )
        );
      });

      await syncMetadata({ key, clientId });

      setAttachments(prev =>
        prev.map(item =>
          item.id === att.id
            ? { ...item, isUploading: false, progress: undefined, clientId }
            : item
        )
      );
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${file.name}`);
      setAttachments(prev => prev.filter(item => item.id !== att.id));
    }
  };

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast.error('Only image uploads are supported');
    }
    if (imageFiles.length === 0) return;

    const newAttachments: MediaAttachment[] = imageFiles.map(file => {
      const id = crypto.randomUUID();
      return {
        id,
        url: URL.createObjectURL(file),
        file,
        isUploading: true,
        progress: 0,
      };
    });

    setAttachments(prev => [...prev, ...newAttachments]);

    for (const att of newAttachments) {
      if (!att.file) continue;
      void uploadSingleFile(att);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      toast.error('Shortcut and message content are required');
      return;
    }

    setIsSaving(true);

    try {
      const existingR2Keys = attachments
        .filter(att => att.r2Key && !att.isUploading)
        .map(att => att.r2Key!);

      const newImageClientIds = attachments
        .filter(att => att.clientId && !att.isUploading)
        .map(att => att.clientId!);

      if (editingReply) {
        await updateQuickReply({
          id: editingReply._id,
          title,
          text,
          imageClientIds: newImageClientIds,
          r2Keys: existingR2Keys,
        });
        toast.success('Quick reply updated');
      } else {
        await createQuickReply({
          title,
          text,
          imageClientIds: newImageClientIds,
        });
        toast.success('Quick reply created');
      }
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to save quick reply');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReply) return;
    setIsDeleting(true);
    try {
      await removeQuickReply({ id: deletingReply._id });
      toast.success('Quick reply deleted');
      setDeletingReply(null);
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete quick reply');
    } finally {
      setIsDeleting(false);
    }
  };
  return { quickReplies, canManage, searchQuery, setSearchQuery, filteredReplies,
    isDialogOpen, setIsDialogOpen, editingReply, title, setTitle, text, setText,
    attachments, isSaving, isCurrentlyUploading, deletingReply, setDeletingReply,
    isDeleting, openCreateDialog, openEditDialog, handleFilesChange,
    handleRemoveAttachment, handleSave, handleDelete };
}

export type QuickRepliesEditor = ReturnType<typeof useQuickRepliesEditor>;
