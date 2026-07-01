import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAction, useMutation } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { TemplateBodyEditor } from './TemplateBodyEditor';
import { TemplateButtonsSection } from './TemplateButtonsSection';
import { TemplateFooterSection } from './TemplateFooterSection';
import { TemplateHeaderSection } from './TemplateHeaderSection';
import {
  buildChangedTemplateComponents,
  detailStateToPreviewComponents,
  hasTemplateDetailChanges,
  templateComponentsToDetailState,
  type TemplateDetailComponentInput,
  type TemplateDetailFormState,
  type TemplateDetailUpdateComponent,
} from './templateDetailEditorHelpers';
import { uploadTemplateHeaderMedia } from './createTemplatePageHelpers';
import {
  headerMediaForType,
  initialHeaderMedia,
  isMediaHeader,
  setHeaderMediaForType,
} from './templateHeaderMediaState';

type TemplateDetailEditorProps = {
  category: string;
  components: TemplateDetailComponentInput[] | null | undefined;
  saving: boolean;
  onSave: (components: TemplateDetailUpdateComponent[]) => Promise<void>;
  onPreviewChange: (components: TemplateDetailComponentInput[]) => void;
};

export function TemplateDetailEditor({
  category,
  components,
  saving,
  onSave,
  onPreviewChange,
}: TemplateDetailEditorProps) {
  const generateUploadUrl = useMutation(api.media.r2Client.generateUploadUrl);
  const syncMetadata = useAction(api.media.r2Client.syncMetadata);
  const derivedState = useMemo(
    () => templateComponentsToDetailState({ category, components }),
    [category, components],
  );
  const [initialState, setInitialState] = useState<TemplateDetailFormState>(derivedState);
  const [formState, setFormState] = useState<TemplateDetailFormState>(derivedState);

  useEffect(() => {
    onPreviewChange(detailStateToPreviewComponents(formState));
  }, [formState, onPreviewChange]);

  const dirty = hasTemplateDetailChanges(initialState, formState);
  const setField = <K extends keyof TemplateDetailFormState>(
    key: K,
    value: TemplateDetailFormState[K],
  ) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };
  const activeHeaderMedia = isMediaHeader(formState.headerType)
    ? headerMediaForType(formState.headerMediaByType, formState.headerType)
    : initialHeaderMedia;

  const uploadPendingHeaderMedia = async (state: TemplateDetailFormState) => {
    if (!state.headerEnabled || !isMediaHeader(state.headerType)) return state;
    const media = headerMediaForType(state.headerMediaByType, state.headerType);
    if (!media.pendingFile || media.r2Key) return state;
    let uploadedMedia = media;
    await uploadTemplateHeaderMedia({
      headerEnabled: state.headerEnabled,
      headerType: state.headerType,
      headerMedia: media,
      generateUploadUrl,
      syncMetadata,
      onUploaded: (key, mimeType) => {
        uploadedMedia = {
          ...media,
          r2Key: key,
          pendingFile: null,
          uploadStatus: 'ready',
          fileMime: mimeType,
        };
      },
    });
    const nextState = {
      ...state,
      headerMediaByType: setHeaderMediaForType(
        state.headerMediaByType,
        state.headerType,
        uploadedMedia,
      ),
    };
    setFormState(nextState);
    return nextState;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const preparedState = await uploadPendingHeaderMedia(formState);
      const changedComponents = buildChangedTemplateComponents(initialState, preparedState);
      if (changedComponents.length === 0) {
        toast.message('No template changes to save.');
        return;
      }
      await onSave(changedComponents);
      setInitialState(preparedState);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update template.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-7">
      <FieldGroup className="gap-7">
        <TemplateHeaderSection
          enabled={formState.headerEnabled}
          headerType={formState.headerType}
          headerText={formState.headerText}
          media={activeHeaderMedia}
          mediaByType={formState.headerMediaByType}
          onEnabledChange={(enabled) => setField('headerEnabled', enabled)}
          onHeaderTypeChange={(headerType) => setField('headerType', headerType)}
          onHeaderTextChange={(headerText) => setField('headerText', headerText)}
          onMediaChange={() => undefined}
          onMediaByTypeChange={(headerMediaByType) => setField('headerMediaByType', headerMediaByType)}
        />

        <section className="flex flex-col gap-4">
          <h3 className="m-0 text-sm font-semibold text-foreground">
            Main message
          </h3>
          <TemplateBodyEditor
            value={formState.bodyText}
            onChange={(value) => setField('bodyText', value)}
          />
        </section>

        <TemplateFooterSection
          enabled={formState.footerEnabled}
          footerText={formState.footerText}
          onEnabledChange={(enabled) => setField('footerEnabled', enabled)}
          onFooterTextChange={(footerText) => setField('footerText', footerText)}
        />

        <TemplateButtonsSection
          enabled={formState.buttonsEnabled}
          buttons={formState.buttons}
          onEnabledChange={(enabled) => setField('buttonsEnabled', enabled)}
          onButtonsChange={(buttons) => setField('buttons', buttons)}
        />
      </FieldGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={!dirty || saving} className="font-semibold">
          {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
