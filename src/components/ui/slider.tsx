import * as React from 'react';
import { cn } from '@/lib/cn';

interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  label?: string;
  showValue?: boolean;
  valueLabel?: string | ((value: number) => string);
  className?: string;
  disabled?: boolean;
}

export function Slider({
  min,
  max,
  value,
  onChange,
  step = 1,
  label,
  showValue = true,
  valueLabel,
  className,
  disabled = false,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  const displayValue = valueLabel
    ? typeof valueLabel === 'function'
      ? valueLabel(value)
      : valueLabel
    : value;

  return (
    <div className={cn('space-y-3', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-foreground">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-mono font-semibold text-primary">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="slider-input w-full"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentage}%, hsl(var(--secondary)) ${percentage}%, hsl(var(--secondary)) 100%)`,
        }}
      />
    </div>
  );
}
