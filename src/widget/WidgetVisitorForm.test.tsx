import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { DEFAULT_WEB_WIDGET_LEAD_FORM } from "../../shared/webWidgetExperience";
import { WebWidgetPreviewForm } from "../components/channels/WebWidgetPreviewForm";
import { WidgetVisitorForm } from "./WidgetVisitorForm";

const widgetStyles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

const leadForm = {
  ...DEFAULT_WEB_WIDGET_LEAD_FORM,
  fields: {
    name: { visible: true, required: true },
    email: { visible: true, required: false },
    phone: { visible: false, required: false },
  },
  customFields: [
    {
      id: "company",
      label: "Company",
      type: "text" as const,
      options: [],
      required: true,
    },
  ],
};

test("renders required markers in the live visitor form", () => {
  const markup = renderToStaticMarkup(
    <WidgetVisitorForm
      leadForm={leadForm}
      profile={{ name: "", email: "", phone: "", customFields: {} }}
      onChange={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  expect(markup.match(/aria-hidden="true">\*/g)).toHaveLength(2);
  expect(markup).toContain('class="panel visitor-form"');
  expect(markup).toContain('class="visitor-form-title"');
  expect(markup).toContain('class="visitor-form-description"');
});

test("renders required markers in the visitor-form preview", () => {
  const markup = renderToStaticMarkup(
    <WebWidgetPreviewForm
      borderClassName="border-border"
      leadForm={leadForm}
      subduedTextClassName="text-muted-foreground"
      onSubmit={() => undefined}
    />,
  );

  expect(markup.match(/aria-hidden="true">\*/g)).toHaveLength(2);
  expect(markup).toContain("overflow-y-auto");
  expect(markup).toContain("font-sans");
  expect(markup).toContain("pt-7");
  expect(markup).toContain("font-medium");
  expect(markup).not.toContain("font-semibold");
  expect(markup).toContain("rounded-full");
});

test("renders custom contact and numeric fields with native input types", () => {
  const customLeadForm = {
    ...DEFAULT_WEB_WIDGET_LEAD_FORM,
    fields: {
      name: { visible: false, required: false },
      email: { visible: false, required: false },
      phone: { visible: false, required: false },
    },
    customFields: [
      { id: "work_email", label: "Work email", type: "email" as never, options: [], required: false },
      { id: "mobile", label: "Mobile", type: "phone" as never, options: [], required: false },
      { id: "seats", label: "Seats", type: "number" as never, options: [], required: false },
      { id: "website", label: "Website", type: "url" as never, options: [], required: false },
    ],
  };
  const markup = renderToStaticMarkup(
    <WidgetVisitorForm
      leadForm={customLeadForm}
      profile={{ name: "", email: "", phone: "", customFields: {} }}
      onChange={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  expect(markup).toContain('type="email"');
  expect(markup).toContain('type="tel"');
  expect(markup).toContain('type="number"');
  expect(markup).toContain('type="url"');
});

test("renders dropdown custom fields with the widget select control", () => {
  const dropdownLeadForm = {
    ...DEFAULT_WEB_WIDGET_LEAD_FORM,
    fields: {
      name: { visible: false, required: false },
      email: { visible: false, required: false },
      phone: { visible: false, required: false },
    },
    customFields: [
      {
        id: "platform",
        label: "Platform Implementation",
        type: "select" as const,
        options: ["Cloud", "Self-hosted"],
        required: true,
      },
    ],
  };
  const liveMarkup = renderToStaticMarkup(
    <WidgetVisitorForm
      leadForm={dropdownLeadForm}
      profile={{ name: "", email: "", phone: "", customFields: {} }}
      onChange={() => undefined}
      onSubmit={() => undefined}
    />,
  );
  const previewMarkup = renderToStaticMarkup(
    <WebWidgetPreviewForm
      borderClassName="border-border"
      leadForm={dropdownLeadForm}
      subduedTextClassName="text-muted-foreground"
      onSubmit={() => undefined}
    />,
  );

  for (const markup of [liveMarkup, previewMarkup]) {
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain("Select an option");
    expect(markup).not.toContain("<option");
  }
});

test("aligns live form control padding with the dropdown trigger", () => {
  expect(widgetStyles).toContain(
    "input,\ntextarea,\nselect {\n  border: 1px solid #474751;\n  border-radius: 9px;\n  padding: 11px 12px;",
  );
  expect(widgetStyles).toContain(
    ".panel.visitor-form form button.widget-lead-form-select-trigger {\n  margin-top: 0;\n  border: 1px solid #474751;\n  border-radius: 9px;\n  padding: 0 12px;",
  );
});
