"use client";

type Props = { name: string; label: string; value: string; options: { value: string; label: string }[]; className?: string };

// A filter or sort select inside ListToolbar's GET form. It submits the form on change; without JS the search button
// submits it. The label is for screen readers; the options name themselves ("Test only", "Name A–Z").
export function ToolbarSelect({ name, label, value, options, className }: Props) {
  const id = `list-${name}`;
  return (
    <span className={`flex min-w-0 flex-col gap-[3px] ${className ?? ""}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="box-border h-11 w-full min-w-0 cursor-pointer rounded-[12px] bg-white px-3 font-body text-[16px] font-bold text-ink border-ink md:w-auto md:text-[14px]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}
