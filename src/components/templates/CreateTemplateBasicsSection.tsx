import { Flame, ReceiptText } from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  TEMPLATE_CATEGORY_COPY,
  TEMPLATE_CHANNEL_TYPE,
  type TemplateCategory,
} from '@/components/templates/createTemplateFormTypes';

const createTemplateSelectTriggerClass =
  'h-auto min-h-12 w-full justify-between rounded-lg border-border bg-input/50 px-4 py-3.5';
const createTemplateSelectContentClass = 'w-[var(--radix-select-trigger-width)]';
const createTemplateInputClass = 'h-12 border-border px-4 py-3';

type CreateTemplateBasicsSectionProps = {
  templateName: string;
  templateCategory: TemplateCategory;
  onTemplateNameChange: (value: string) => void;
  onTemplateCategoryChange: (value: TemplateCategory) => void;
};

export function CreateTemplateBasicsSection({
  templateName,
  templateCategory,
  onTemplateNameChange,
  onTemplateCategoryChange,
}: CreateTemplateBasicsSectionProps) {
  const selectedCategory = TEMPLATE_CATEGORY_COPY[templateCategory];

  return (
    <FieldGroup className="gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground m-0">Template</h2>
        <p className="text-xs text-muted-foreground m-0">
          Create an approved WhatsApp message for broadcasts or automated follow-ups.
        </p>
      </div>

      <Field className="gap-2">
        <FieldLabel htmlFor="tpl-name">Template name</FieldLabel>
        <Input
          id="tpl-name"
          value={templateName}
          onChange={(event) =>
            onTemplateNameChange(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
          }
          placeholder="e.g. order_update"
          autoComplete="off"
          className={createTemplateInputClass}
          required
        />
        <FieldDescription className="text-xs">
          Lower case letters, numbers and underscores only.
        </FieldDescription>
      </Field>

      <Field className="gap-2">
        <FieldLabel htmlFor="tpl-template-type">Template type</FieldLabel>
        <Select value={TEMPLATE_CHANNEL_TYPE}>
          <SelectTrigger id="tpl-template-type" className={createTemplateSelectTriggerClass}>
            <SelectValue>
              <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <SiWhatsapp className="shrink-0 text-[#25D366]" />
                <span className="truncate text-sm font-semibold leading-tight text-foreground">
                  WhatsApp
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className={createTemplateSelectContentClass}>
            <SelectGroup>
              <SelectItem value="whatsapp" textValue="WhatsApp">
                <span className="flex w-full min-w-0 items-center gap-2 py-1.5 text-left">
                  <SiWhatsapp className="shrink-0 text-[#25D366]" />
                  <span className="truncate text-sm font-semibold leading-tight text-foreground">
                    WhatsApp
                  </span>
                </span>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="gap-2">
        <FieldLabel htmlFor="tpl-category">Template category</FieldLabel>
        <Select
          value={templateCategory}
          onValueChange={(value) => onTemplateCategoryChange(value as TemplateCategory)}
        >
          <SelectTrigger id="tpl-category" className={createTemplateSelectTriggerClass}>
            <SelectValue>
              <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                {templateCategory === 'marketing' ? (
                  <Flame className="shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <ReceiptText className="shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="truncate text-sm font-semibold leading-tight text-foreground">
                  {selectedCategory.label}
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className={createTemplateSelectContentClass}>
            <SelectGroup>
              <SelectItem value="marketing" textValue={TEMPLATE_CATEGORY_COPY.marketing.label}>
                <span className="flex w-full min-w-0 items-center gap-2 py-1.5 text-left">
                  <Flame className="shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate text-sm font-semibold leading-tight text-foreground">
                    {TEMPLATE_CATEGORY_COPY.marketing.label}
                  </span>
                </span>
              </SelectItem>
              <SelectItem value="utility" textValue={TEMPLATE_CATEGORY_COPY.utility.label}>
                <span className="flex w-full min-w-0 items-center gap-2 py-1.5 text-left">
                  <ReceiptText className="shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate text-sm font-semibold leading-tight text-foreground">
                    {TEMPLATE_CATEGORY_COPY.utility.label}
                  </span>
                </span>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}
