import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ProductImage } from '../types';

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted aspect-square overflow-hidden rounded-lg border">
        {current ? (
          <img
            src={current.url}
            alt={current.alt_text ?? name}
            className="size-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center">
            No image
          </div>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-pressed={index === selected}
                className={cn(
                  'size-16 overflow-hidden rounded-md border-2',
                  index === selected ? 'border-primary' : 'border-transparent opacity-70'
                )}
              >
                <img src={image.url} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
