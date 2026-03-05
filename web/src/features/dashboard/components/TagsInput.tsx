import { KeyboardEvent, useMemo, useState } from "react";
import { AppTag } from "../../../ui/components";

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

function normalize(tag: string): string {
  return tag.trim().toUpperCase();
}

export function TagsInput({ value, onChange, placeholder = "Digite tags e use virgula ou espaco" }: TagsInputProps) {
  const [inputValue, setInputValue] = useState("");

  const normalizedTags = useMemo(() => value.map(normalize).filter(Boolean), [value]);

  function addTag(rawValue: string) {
    const next = normalize(rawValue);

    if (!next) {
      return;
    }

    if (normalizedTags.includes(next)) {
      return;
    }

    onChange([...normalizedTags, next]);
  }

  function removeTag(tag: string) {
    onChange(normalizedTags.filter((item) => item !== tag));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const shouldCommit = event.key === "," || event.key === " " || event.key === "Enter";

    if (!shouldCommit) {
      return;
    }

    event.preventDefault();
    addTag(inputValue);
    setInputValue("");
  }

  return (
    <div className="asstramed-tags-editor">
      {normalizedTags.map((tag) => (
        <AppTag key={tag} closable onClose={() => removeTag(tag)} color="blue">
          {tag}
        </AppTag>
      ))}
      <input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={() => {
          addTag(inputValue);
          setInputValue("");
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </div>
  );
}
