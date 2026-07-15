import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
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
  BUTTON_TYPE_OPTIONS,
  createTemplateInputClass,
  createTemplateSelectContentClass,
  createTemplateSelectTriggerClass,
} from './templateBuilderConstants';
import type { ButtonType, TemplateButton } from './templateBuilderTypes';
import { TemplateSectionSwitch } from './TemplateSectionSwitch';

type TemplateButtonsSectionProps = {
  enabled: boolean;
  buttons: TemplateButton[];
  onEnabledChange: (enabled: boolean) => void;
  onButtonsChange: (buttons: TemplateButton[]) => void;
};

function defaultButton(type: ButtonType): TemplateButton {
  if (type === 'URL') return { type, text: 'Visit Website', url: 'https://' };
  if (type === 'PHONE_NUMBER') return { type, text: 'Call Us', phone_number: '' };
  if (type === 'COPY_CODE') return { type, text: 'Copy Code', example: 'PROMO20' };
  return { type: 'QUICK_REPLY', text: '' };
}

function updateButton(
  buttons: TemplateButton[],
  index: number,
  updater: (button: TemplateButton) => TemplateButton,
) {
  return buttons.map((button, buttonIndex) =>
    buttonIndex === index ? updater(button) : button,
  );
}

function selectedButtonOption(type: ButtonType) {
  return BUTTON_TYPE_OPTIONS.find((option) => option.value === type);
}

export function TemplateButtonsSection({
  enabled,
  buttons,
  onEnabledChange,
  onButtonsChange,
}: TemplateButtonsSectionProps) {
  const setButtonText = (index: number, text: string) => {
    onButtonsChange(updateButton(buttons, index, (button) => ({ ...button, text })));
  };

  const setButtonType = (index: number, type: ButtonType) => {
    onButtonsChange(updateButton(buttons, index, () => defaultButton(type)));
  };

  const removeButton = (index: number) => {
    const next = buttons.filter((_, buttonIndex) => buttonIndex !== index);
    onButtonsChange(next.length > 0 ? next : [defaultButton('QUICK_REPLY')]);
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-3xs">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-base font-semibold text-foreground">Buttons</h2>
          <p className="m-0 text-xs text-muted-foreground">
            Add interactive actions to the message.
          </p>
        </div>
        <TemplateSectionSwitch
          enabled={enabled}
          label="Buttons"
          onEnabledChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <div className="flex flex-col gap-5">
          {buttons.map((button, index) => {
            const option = selectedButtonOption(button.type);
            return (
              <div key={index} className="flex flex-col gap-3.5">
                <div className="flex flex-wrap items-end gap-3">
                  <Field className="w-[240px] gap-2">
                    <FieldLabel>Button text</FieldLabel>
                    <Input
                      value={button.text}
                      onChange={(event) => setButtonText(index, event.target.value)}
                      maxLength={25}
                      placeholder="e.g. Reply back"
                      className={createTemplateInputClass}
                      required
                    />
                  </Field>

                  <Field className="w-[260px] max-w-full gap-2">
                    <FieldLabel>Type</FieldLabel>
                    <Select
                      value={button.type}
                      onValueChange={(value) => setButtonType(index, value as ButtonType)}
                    >
                      <SelectTrigger className={createTemplateSelectTriggerClass}>
                        <SelectValue>
                          {option ? (
                            <span className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                              <span className="truncate text-[13px] font-semibold leading-tight text-foreground">
                                {option.label}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-right text-[11px] leading-tight text-muted-foreground">
                                {option.description}
                              </span>
                            </span>
                          ) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start" className={createTemplateSelectContentClass}>
                        <SelectGroup>
                          {BUTTON_TYPE_OPTIONS.map((item) => (
                            <SelectItem key={item.value} value={item.value} textValue={item.label}>
                              <span className="flex w-full min-w-0 items-center justify-between gap-3 py-1.5 text-left">
                                <span className="truncate text-[13px] font-semibold leading-tight text-foreground">
                                  {item.label}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-right text-[11px] leading-tight text-muted-foreground">
                                  {item.description}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  {buttons.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeButton(index)}
                      aria-label="Remove button"
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>

                {button.type === 'URL' && (
                  <Field className="w-[412px] max-w-full gap-2">
                    <FieldLabel>URL address</FieldLabel>
                    <Input
                      value={button.url}
                      onChange={(event) =>
                        onButtonsChange(
                          updateButton(buttons, index, (current) =>
                            current.type === 'URL'
                              ? { ...current, url: event.target.value }
                              : current,
                          ),
                        )
                      }
                      placeholder="https://example.com"
                      className={createTemplateInputClass}
                      required
                    />
                  </Field>
                )}

                {button.type === 'PHONE_NUMBER' && (
                  <Field className="w-[412px] max-w-full gap-2">
                    <FieldLabel>Phone number</FieldLabel>
                    <Input
                      value={button.phone_number}
                      onChange={(event) =>
                        onButtonsChange(
                          updateButton(buttons, index, (current) =>
                            current.type === 'PHONE_NUMBER'
                              ? { ...current, phone_number: event.target.value }
                              : current,
                          ),
                        )
                      }
                      placeholder="e.g. +60123456789"
                      className={createTemplateInputClass}
                      required
                    />
                  </Field>
                )}

                {button.type === 'COPY_CODE' && (
                  <Field className="w-[412px] max-w-full gap-2">
                    <FieldLabel>Example OTP or promo code</FieldLabel>
                    <Input
                      value={button.example}
                      onChange={(event) =>
                        onButtonsChange(
                          updateButton(buttons, index, (current) =>
                            current.type === 'COPY_CODE'
                              ? { ...current, example: event.target.value }
                              : current,
                          ),
                        )
                      }
                      maxLength={15}
                      placeholder="e.g. OTP123"
                      className={createTemplateInputClass}
                      required
                    />
                  </Field>
                )}
              </div>
            );
          })}

          {buttons.length < 10 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onButtonsChange([...buttons, defaultButton('QUICK_REPLY')])}
              className="h-auto w-fit p-0 font-semibold text-primary shadow-none hover:bg-transparent hover:text-primary/80"
            >
              <Plus data-icon="inline-start" />
              Add button
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
