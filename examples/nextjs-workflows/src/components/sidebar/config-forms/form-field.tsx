"use client";

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none transition-colors focus:border-[#3b82f6]"
      style={{ borderColor: "#e5e7eb" }}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      placeholder={placeholder}
      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none transition-colors focus:border-[#3b82f6]"
      style={{ borderColor: "#e5e7eb" }}
    />
  );
}

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-md border bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none transition-colors focus:border-[#3b82f6]"
      style={{ borderColor: "#e5e7eb" }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function TextAreaInput({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border bg-white px-2.5 py-1.5 font-mono text-xs text-gray-900 outline-none transition-colors focus:border-[#3b82f6]"
      style={{ borderColor: "#e5e7eb" }}
    />
  );
}
