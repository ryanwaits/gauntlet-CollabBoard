"use client";

import type { TransformConfig } from "@/types/node-configs";
import { FormField, SelectInput, TextAreaInput } from "./form-field";

export function TransformForm({
  config,
  onChange,
}: {
  config: TransformConfig;
  onChange: (c: Partial<TransformConfig>) => void;
}) {
  return (
    <>
      <FormField label="Language">
        <SelectInput
          value={config.language}
          onChange={(v) => onChange({ language: v as TransformConfig["language"] })}
          options={[
            { value: "jsonata", label: "JSONata" },
            { value: "javascript", label: "JavaScript" },
          ]}
        />
      </FormField>
      <FormField label="Expression">
        <TextAreaInput
          value={config.expression}
          onChange={(v) => onChange({ expression: v })}
          placeholder={config.language === "jsonata" ? "$.payload" : "return data;"}
          rows={6}
        />
      </FormField>
    </>
  );
}
