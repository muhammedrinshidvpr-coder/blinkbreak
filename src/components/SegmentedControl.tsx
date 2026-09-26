import type { CSSProperties } from 'react';

export function SegmentedControl<T extends string>({ value, options, onChange, label, testPrefix, radio = false, small = false }: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  testPrefix: string;
  radio?: boolean;
  small?: boolean;
}) {
  const selected = Math.max(0, options.findIndex(option => option.id === value));
  return (
    <div className={`bb-segmented ${small ? 'small' : ''}`} role={radio ? 'radiogroup' : 'group'} aria-label={label}
      style={{ '--segments': options.length, '--selected': selected } as CSSProperties}>
      <span className="bb-segment-indicator" aria-hidden="true" />
      {options.map(({ id, label: text }, index) => (
        <button key={id} type="button" className={value === id ? 'is-active' : ''}
          role={radio ? 'radio' : undefined} aria-checked={radio ? value === id : undefined}
          aria-pressed={!radio ? value === id : undefined} tabIndex={radio && value !== id ? -1 : 0}
          data-testid={`${testPrefix}-${id}`} onClick={() => onChange(id)}
          onKeyDown={event => {
            if (!radio) return;
            let next = index;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + options.length - 1) % options.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = options.length - 1;
            else return;
            event.preventDefault();
            onChange(options[next].id);
            (event.currentTarget.parentElement?.querySelectorAll('button')[next] as HTMLButtonElement)?.focus();
          }}>{text}</button>
      ))}
    </div>
  );
}
