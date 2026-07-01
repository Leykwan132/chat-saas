import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import { WhatsAppTemplatePreview } from '@/components/WhatsAppTemplatePreview';
import { Button } from '@/components/ui/button';
import { CreateTemplateBasicsSection } from '@/components/templates/CreateTemplateBasicsSection';
import { TemplateBodyEditor } from '@/components/templates/TemplateBodyEditor';
import { TemplateButtonsSection } from '@/components/templates/TemplateButtonsSection';
import { TemplateFooterSection } from '@/components/templates/TemplateFooterSection';
import { TemplateHeaderSection } from '@/components/templates/TemplateHeaderSection';
import { TemplateLibraryDialog } from '@/components/templates/TemplateLibraryDialog';
import {
  DEFAULT_TEMPLATE_LANGUAGE,
  type TemplateCategory,
} from '@/components/templates/createTemplateFormTypes';
import {
  buildComponentsForTemplateSubmit,
  buildPreviewComponents,
  categoryToPurpose,
  isMediaHeader,
} from '@/components/templates/createTemplatePageHelpers';
import {
  headerMediaForType,
  initialHeaderMedia,
  revokeHeaderMediaPreviewUrls,
  setHeaderMediaForType,
} from '@/components/templates/templateHeaderMediaState';
import type {
  HeaderMediaByType,
  HeaderType,
  TemplateButton,
  TemplateLibraryPreset,
} from '@/components/templates/templateBuilderTypes';

const r2ClientApi = api.media.r2Client;

export default function CreateTemplatePage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const channels = useQuery(api.channels.listForCurrentOrg, {});
  const createLocalTemplate = useMutation(api.whatsappTemplates.createLocalTemplate);
  const generateUploadUrl = useMutation(r2ClientApi.generateUploadUrl);
  const syncMetadata = useAction(r2ClientApi.syncMetadata);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('marketing');
  const [bodyText, setBodyText] = useState('');
  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [headerType, setHeaderType] = useState<HeaderType>('TEXT');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaByType, setHeaderMediaByType] = useState<HeaderMediaByType>({});
  const [footerEnabled, setFooterEnabled] = useState(false);
  const [footerText, setFooterText] = useState('');
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const [templateButtons, setTemplateButtons] = useState<TemplateButton[]>([
    { type: 'QUICK_REPLY', text: '' },
  ]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const headerMedia = isMediaHeader(headerType)
    ? headerMediaForType(headerMediaByType, headerType)
    : initialHeaderMedia;
  const headerMediaByTypeRef = useRef(headerMediaByType);

  useEffect(() => {
    headerMediaByTypeRef.current = headerMediaByType;
  }, [headerMediaByType]);

  useEffect(() => () => revokeHeaderMediaPreviewUrls(headerMediaByTypeRef.current), []);

  const activeChannelId = useMemo(() => {
    return (
      channels?.find(
        (channel) =>
          channel.service === 'whatsapp' &&
          channel.status === 'connected' &&
          Boolean(channel.wabaId?.trim()) &&
          Boolean(channel.phoneNumberId?.trim()),
      )?._id ?? null
    );
  }, [channels]);

  const previewComponents = useMemo(() => {
    return buildPreviewComponents({
      headerEnabled,
      headerType,
      headerText,
      headerMediaStatus: headerMedia.uploadStatus,
      bodyText,
      buttonsEnabled,
      templateButtons,
      footerEnabled,
      footerText,
    });
  }, [
    bodyText,
    buttonsEnabled,
    footerEnabled,
    footerText,
    headerEnabled,
    headerMedia.uploadStatus,
    headerText,
    headerType,
    templateButtons,
  ]);

  const applyPreset = (preset: TemplateLibraryPreset) => {
    revokeHeaderMediaPreviewUrls(headerMediaByType);
    setTemplateName(preset.name);
    setTemplateCategory(preset.category);
    setHeaderEnabled(true);
    setHeaderType('TEXT');
    setHeaderText(preset.headerText);
    setHeaderMediaByType({});
    setBodyText(preset.bodyText);
    setButtonsEnabled(preset.buttons.length > 0);
    setTemplateButtons(preset.buttons.map((button) => ({ ...button })));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeChannelId) {
      toast.error('No active WhatsApp channel connected.');
      return;
    }
    const name = templateName.trim();
    if (!/^[a-z0-9_]+$/.test(name)) {
      toast.error('Template name must be lower_case_snake_case only.');
      return;
    }
    if (!bodyText.trim()) {
      toast.error('Main message body is required.');
      return;
    }
    if (headerEnabled && isMediaHeader(headerType) && headerMedia.uploadStatus !== 'ready') {
      toast.error('Choose a supported header media file before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const { components, parameterKeys } = await buildComponentsForTemplateSubmit({
        headerEnabled,
        headerType,
        headerText,
        headerMedia,
        bodyText,
        footerEnabled,
        footerText,
        buttonsEnabled,
        templateButtons,
        generateUploadUrl,
        syncMetadata,
        onHeaderMediaUploaded: (key, mimeType) => {
          if (!isMediaHeader(headerType)) return;
          setHeaderMediaByType((current) =>
            setHeaderMediaForType(current, headerType, {
              ...headerMedia,
              r2Key: key,
              pendingFile: null,
              uploadStatus: 'ready',
              fileMime: mimeType,
            }),
          );
        },
      });
      const baseArgs = {
        channelId: activeChannelId,
        name,
        language: DEFAULT_TEMPLATE_LANGUAGE,
        purpose: categoryToPurpose(templateCategory),
        components,
      };
      await createLocalTemplate(
        parameterKeys.length > 0
          ? { ...baseArgs, parameterFormat: 'named' as const }
          : baseArgs,
      );
      toast.success('Template saved. Submitting to Meta in the background.');
      navigate(`/dashboard/${agentId}/templates`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save template.');
    } finally {
      setSubmitting(false);
    }
  };

  if (channels === undefined) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl animate-fade-in pb-20">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5" asChild>
          <Link to={`/dashboard/${agentId}/templates`}>
            <ArrowLeft data-icon="inline-start" />
            Back to Message Template
          </Link>
        </Button>
      </div>

      <header className="mb-6 border-b border-border pb-6">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-foreground">
          Create template
        </h1>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          <CreateTemplateBasicsSection
            templateName={templateName}
            templateCategory={templateCategory}
            onTemplateNameChange={setTemplateName}
            onTemplateCategoryChange={setTemplateCategory}
          />

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-base font-semibold text-foreground">
                  Main Message <span className="ml-0.5 font-bold text-red-500">*</span>
                </h2>
                <p className="m-0 text-xs text-muted-foreground">
                  The primary body copy of your template.
                </p>
              </div>
              <TemplateLibraryDialog
                open={libraryOpen}
                onOpenChange={setLibraryOpen}
                onSelectPreset={applyPreset}
              />
            </div>
            <TemplateBodyEditor value={bodyText} onChange={setBodyText} />
          </section>

          <TemplateHeaderSection
            enabled={headerEnabled}
            headerType={headerType}
            headerText={headerText}
            media={headerMedia}
            mediaByType={headerMediaByType}
            onEnabledChange={setHeaderEnabled}
            onHeaderTypeChange={setHeaderType}
            onHeaderTextChange={setHeaderText}
            onMediaChange={() => undefined}
            onMediaByTypeChange={setHeaderMediaByType}
          />

          <TemplateButtonsSection
            enabled={buttonsEnabled}
            buttons={templateButtons}
            onEnabledChange={setButtonsEnabled}
            onButtonsChange={setTemplateButtons}
          />

          <TemplateFooterSection
            enabled={footerEnabled}
            footerText={footerText}
            onEnabledChange={setFooterEnabled}
            onFooterTextChange={setFooterText}
          />

          <div className="mt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/dashboard/${agentId}/templates`)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="font-semibold">
              {submitting && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {submitting ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </div>
        </form>

        <aside className="w-full md:sticky md:top-6">
          <WhatsAppTemplatePreview
            templateName={templateName || undefined}
            components={previewComponents}
            overrideHeaderMediaPreviewUrl={headerMedia.previewUrl}
            fillWidth
          />
        </aside>
      </div>
    </div>
  );
}
