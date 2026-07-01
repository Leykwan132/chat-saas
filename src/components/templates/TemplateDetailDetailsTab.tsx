import { useState } from 'react';
import { WhatsAppTemplatePreview } from '@/components/WhatsAppTemplatePreview';
import { TemplateDetailEditor } from './TemplateDetailEditor';
import type {
  TemplateDetailComponentInput,
  TemplateDetailUpdateComponent,
} from './templateDetailEditorHelpers';

type TemplateDetailDetailsTabProps = {
  templateName: string;
  category: string;
  components: TemplateDetailComponentInput[] | null | undefined;
  loading: boolean;
  saving: boolean;
  onSave: (components: TemplateDetailUpdateComponent[]) => Promise<void>;
};

export function TemplateDetailDetailsTab({
  templateName,
  category,
  components,
  loading,
  saving,
  onSave,
}: TemplateDetailDetailsTabProps) {
  const [previewComponents, setPreviewComponents] = useState<
    TemplateDetailComponentInput[]
  >(components ?? []);

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <TemplateDetailEditor
          category={category}
          components={components}
          saving={saving}
          onSave={onSave}
          onPreviewChange={setPreviewComponents}
        />
      </div>

      <div className="flex flex-col lg:col-span-5">
        <WhatsAppTemplatePreview
          templateName={templateName}
          components={previewComponents}
          isLoading={loading}
          emptyMessage="Template preview unavailable."
        />
      </div>
    </div>
  );
}
