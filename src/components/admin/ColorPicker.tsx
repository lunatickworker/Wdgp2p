import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presetColors = [
    '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316',
    '#1F2937', '#4B5563', '#6B7280', '#000000', '#FFFFFF',
    '#D4AF37', '#8B7355', '#0F172A', '#1E293B', '#292524'
  ];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="pr-12"
          />
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded border border-gray-300 cursor-pointer"
            style={{ backgroundColor: value }}
            onClick={() => setIsOpen(!isOpen)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Palette className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && (
        <div className="p-3 border rounded-lg bg-white dark:bg-gray-800 shadow-lg">
          <div className="grid grid-cols-5 gap-2 mb-3">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                className="w-10 h-10 rounded border-2 border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 cursor-pointer"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              닫기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
