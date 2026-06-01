import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <label className="search-bar">
      <Search aria-hidden="true" size={20} />
      <span className="sr-only">Zoeken</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
