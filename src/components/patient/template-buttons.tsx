'use client';

interface Props {
  templates: string[];
  onInsert: (text: string) => void;
}

export function TemplateButtons({ templates, onInsert }: Props) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {templates.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onInsert(t)}
          className="px-2 py-0.5 text-xs rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
