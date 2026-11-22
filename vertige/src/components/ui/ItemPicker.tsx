"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { CardItem } from "@/lib/card-item";
import { formatPrice } from "@/lib/format";
import { matchScore } from "@/lib/search";
import { cn } from "@/lib/utils";
import { Thumb } from "./Thumb";

/** Champ de recherche d'objet (motif ARIA « combobox » avec liste de suggestions). */
export function ItemPicker({
  items,
  label,
  onPick,
  placeholder = "Chercher un objet…",
}: {
  items: CardItem[];
  label: string;
  onPick: (item: CardItem) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return items
      .map((item) => ({ item, s: matchScore(item.name, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.item.priceEur - b.item.priceEur)
      .slice(0, 8)
      .map((x) => x.item);
  }, [items, query]);

  const pick = (item: CardItem) => {
    onPick(item);
    setQuery("");
    setOpen(false);
  };

  const listId = `${id}-liste`;
  const showList = open && suggestions.length > 0;

  return (
    <div className="relative">
      <label htmlFor={`${id}-champ`} className="sr-only">
        {label}
      </label>
      <div className="flex h-12 items-center gap-2 rounded-full bg-surface px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand">
        <Search aria-hidden="true" strokeWidth={1.75} className="size-4 text-muted" />
        <input
          id={`${id}-champ`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${id}-opt-${active}` : undefined}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pick(suggestions[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
      </div>
      {showList && (
        <ul id={listId} role="listbox" aria-label={label} className="panel absolute inset-x-0 top-14 z-30 max-h-80 overflow-y-auto p-1.5">
          {suggestions.map((item, i) => (
            <li
              key={item.slug}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(item)}
              onMouseEnter={() => setActive(i)}
              data-tier={item.tier}
              className={cn("flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2", i === active && "bg-elevated")}
            >
              <Thumb src={item.image} kind={item.imageKind} tier={item.tier} size={40} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{item.name}</span>
              <span className="price shrink-0 text-[14px] font-bold text-(--tier)">{formatPrice(item.priceEur)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
