import type {
  WebWidgetCustomLeadField,
  WebWidgetCustomLeadFieldType,
} from "../../../shared/webWidgetExperience";
import { Hash, Link, List, Mail, Pencil, Phone, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isCustomLeadFieldReady } from "./webWidgetLeadFormState";

type WebWidgetCustomLeadFieldRowProps = {
  field: WebWidgetCustomLeadField;
  editing: boolean;
  saving: boolean;
  onChange: (
    update: (field: WebWidgetCustomLeadField) => WebWidgetCustomLeadField,
  ) => void;
  onConfirm: () => void;
  onEdit: () => void;
  onRemove: () => void;
};

const fieldTypeLabels: Record<WebWidgetCustomLeadFieldType, string> = {
  text: "Short text",
  email: "Email",
  phone: "Phone number",
  number: "Number",
  url: "Website URL",
  select: "Dropdown",
};

export function WebWidgetCustomLeadFieldRow({
  field,
  editing,
  saving,
  onChange,
  onConfirm,
  onEdit,
  onRemove,
}: WebWidgetCustomLeadFieldRowProps) {
  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 py-3 text-sm text-foreground">
        <div className="grid gap-0.5">
          <span>{field.label}</span>
          <span className="text-sm text-muted-foreground">
            {fieldTypeLabels[field.type]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {field.required ? "Required" : "Optional"}
          </span>
          <Switch
            checked={field.required}
            disabled={saving}
            aria-label={`Require ${field.label}`}
            onCheckedChange={(required) =>
              onChange((current) => ({ ...current, required }))
            }
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={saving}
            aria-label={`Edit ${field.label}`}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={saving}
            aria-label={`Remove ${field.label}`}
            onClick={onRemove}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 py-4">
      <div className="flex items-center gap-2">
        <Input
          value={field.label}
          disabled={saving}
          placeholder="Field label"
          aria-label="Field label"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              label: event.target.value,
            }))
          }
        />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={saving}
          aria-label={`Remove ${field.label || "field"}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
      <div className="grid gap-2">
        <p className="text-xs text-muted-foreground">Type</p>
        <Select
          value={field.type}
          disabled={saving}
          onValueChange={(value: WebWidgetCustomLeadFieldType) =>
            onChange((current) => ({
              ...current,
              type: value,
              options:
                value === "select"
                  ? current.options.length >= 2
                    ? current.options
                    : ["", ""]
                  : [],
            }))
          }
        >
          <SelectTrigger className="h-10 text-[15px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text" className="text-[15px]">
              <span className="flex items-center gap-2">
                <Type className="size-4 text-muted-foreground" />
                Short text
              </span>
            </SelectItem>
            <SelectItem value="email" className="text-[15px]">
              <span className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                Email
              </span>
            </SelectItem>
            <SelectItem value="phone" className="text-[15px]">
              <span className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                Phone number
              </span>
            </SelectItem>
            <SelectItem value="number" className="text-[15px]">
              <span className="flex items-center gap-2">
                <Hash className="size-4 text-muted-foreground" />
                Number
              </span>
            </SelectItem>
            <SelectItem value="url" className="text-[15px]">
              <span className="flex items-center gap-2">
                <Link className="size-4 text-muted-foreground" />
                Website URL
              </span>
            </SelectItem>
            <SelectItem value="select" className="text-[15px]">
              <span className="flex items-center gap-2">
                <List className="size-4 text-muted-foreground" />
                Dropdown
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center justify-between text-xs text-muted-foreground">
        {field.required ? "Required" : "Optional"}
        <Switch
          checked={field.required}
          disabled={saving}
          aria-label={`Require ${field.label || "field"}`}
          onCheckedChange={(required) =>
            onChange((current) => ({ ...current, required }))
          }
        />
      </label>
      {field.type === "select" ? (
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Dropdown options</p>
          {field.options.map((option, index) => (
            <div key={`${field.id}-${index}`} className="flex gap-2">
              <Input
                value={option}
                disabled={saving}
                placeholder={`Option ${index + 1}`}
                aria-label={`Dropdown option ${index + 1}`}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    options: current.options.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item,
                    ),
                  }))
                }
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={saving || field.options.length <= 2}
                aria-label={`Remove option ${index + 1}`}
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    options: current.options.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  }))
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-fit"
            disabled={saving}
            onClick={() =>
              onChange((current) => ({
                ...current,
                options: [...current.options, ""],
              }))
            }
          >
            Add option
          </Button>
        </div>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="w-fit"
        disabled={saving || !isCustomLeadFieldReady(field)}
        onClick={onConfirm}
      >
        Confirm
      </Button>
    </div>
  );
}
