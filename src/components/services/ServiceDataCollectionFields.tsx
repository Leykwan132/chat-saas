import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { DataCollectFieldIcon } from '@/components/services/DataCollectFieldIcon';
import {
  CUSTOM_FIELD_TYPE_OPTIONS,
  EMPTY_FIELD_DRAFT,
  getAvailableFieldSuggestions,
} from '@/components/services/serviceFormConstants';
import {
  SelectFieldOptionsEditor,
  WizardSelectField,
} from '@/components/services/serviceFormControls';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { fieldTypePreview, type FieldType, type ServiceFieldForm, type ServiceForm } from '@/lib/serviceForm';

export function ServiceDataCollectionFields({
  form,
  setForm,
  disabled = false,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  disabled?: boolean;
}) {
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<ServiceFieldForm>(EMPTY_FIELD_DRAFT);
  const [selectOptionRows, setSelectOptionRows] = useState<string[]>(['']);
  const availableFieldSuggestions = useMemo(() => getAvailableFieldSuggestions(form), [form]);

  const resetFieldDraft = () => {
    setFieldDraft({ ...EMPTY_FIELD_DRAFT });
    setSelectOptionRows(['']);
  };

  const closeAddFieldDialog = () => {
    setAddFieldDialogOpen(false);
    resetFieldDraft();
  };

  const addSuggestedField = (label: string, type: FieldType) => {
    setForm((previous) => ({
      ...previous,
      fields: [...previous.fields, { key: '', label, type, optionsText: '' }],
    }));
    closeAddFieldDialog();
  };

  const confirmFieldDraft = () => {
    const label = fieldDraft.label.trim();
    if (!label) {
      toast.error('Enter a field label before confirming.');
      return;
    }
    const optionsText = fieldDraft.type === 'select'
      ? selectOptionRows.map((option) => option.trim()).filter(Boolean).join(', ')
      : fieldDraft.optionsText;
    if (fieldDraft.type === 'select' && !optionsText) {
      toast.error('Add at least one option for select fields.');
      return;
    }
    setForm((previous) => ({
      ...previous,
      fields: [...previous.fields, { ...fieldDraft, label, optionsText }],
    }));
    closeAddFieldDialog();
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3">
        {form.fields.length > 0 ? <div className="flex w-full flex-col gap-3">
          {form.fields.map((field, index) => <div key={`${field.key}-${index}`} className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <DataCollectFieldIcon type={field.type} />
              <div className="min-w-0"><span className="text-sm font-medium text-foreground">{field.label}</span><span className="ml-2 text-xs text-muted-foreground">{fieldTypePreview(field)}</span></div>
            </div>
            {!disabled ? <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-foreground" aria-label={`Remove ${field.label}`} onClick={() => setForm((previous) => ({ ...previous, fields: previous.fields.filter((_, itemIndex) => itemIndex !== index) }))}><X className="size-4" /></Button> : null}
          </div>)}
        </div> : null}
        {!disabled ? <Button type="button" variant="link" className="h-auto w-fit gap-1.5 px-0 text-muted-foreground" onClick={() => { resetFieldDraft(); setAddFieldDialogOpen(true); }}><Plus className="size-4" />Add more field</Button> : null}
      </div>
      <Dialog open={addFieldDialogOpen} onOpenChange={(open) => { setAddFieldDialogOpen(open); if (!open) resetFieldDraft(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Field</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            {availableFieldSuggestions.length > 0 ? <><div className="flex flex-col gap-2"><span className="text-xs font-medium text-muted-foreground">Suggestions</span><Suggestions>{availableFieldSuggestions.map((suggestion) => <Suggestion key={suggestion.id} suggestion={suggestion.label} className="gap-1.5" onClick={() => addSuggestedField(suggestion.label, suggestion.type)}><DataCollectFieldIcon type={suggestion.type} />{suggestion.label}</Suggestion>)}</Suggestions></div><Separator /></> : null}
            <div className="flex flex-col gap-3">
              <WizardSelectField label="Type" value={fieldDraft.type} options={CUSTOM_FIELD_TYPE_OPTIONS} onChange={(value) => { setFieldDraft((previous) => ({ ...previous, type: value as FieldType })); if (value === 'select') setSelectOptionRows(['']); }} />
              <div className="flex flex-col gap-2"><span className="text-sm font-medium">Field label</span><Input placeholder="Field label" value={fieldDraft.label} onChange={(event) => setFieldDraft((previous) => ({ ...previous, label: event.target.value }))} /></div>
              {fieldDraft.type === 'select' ? <SelectFieldOptionsEditor options={selectOptionRows} onChange={setSelectOptionRows} /> : null}
            </div>
          </div>
          <DialogFooter className="gap-4 sm:gap-6"><Button type="button" variant="link" className="h-auto px-0 text-muted-foreground" onClick={closeAddFieldDialog}>Cancel</Button><Button type="button" onClick={confirmFieldDraft}>Confirm</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5"><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">Note: </span>Your AI agent will collect this information naturally in conversation, then prepare the booking before checking availability.</p></div>
    </div>
  );
}
