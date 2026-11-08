import { useFieldId } from "./fieldContext";
import { fieldClass } from "./TextInput";

export default function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  id?: string;
}) {
  const fieldId = useFieldId(id);
  return (
    <textarea
      id={fieldId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className={`${fieldClass} resize-y`}
    />
  );
}
