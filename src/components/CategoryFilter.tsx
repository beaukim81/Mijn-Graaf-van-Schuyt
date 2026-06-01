interface CategoryFilterProps<T extends string> {
  label: string;
  value: T | "Alle";
  options: T[];
  onChange: (value: T | "Alle") => void;
}

export function CategoryFilter<T extends string>({ label, value, options, onChange }: CategoryFilterProps<T>) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T | "Alle")}>
        <option value="Alle">Alle</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
