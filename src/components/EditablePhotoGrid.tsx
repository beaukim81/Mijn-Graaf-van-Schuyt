import { Trash2 } from "lucide-react";

interface EditablePhotoGridProps {
  images: string[];
  alt: string;
  onRemove: (index: number) => void;
}

export function EditablePhotoGrid({ images, alt, onRemove }: EditablePhotoGridProps) {
  if (images.length === 0) return null;
  const visibleImages = images.slice(0, 10);

  return (
    <div className={`editable-photo-grid photo-grid photo-grid--${Math.min(visibleImages.length, 4)}`}>
      {visibleImages.map((image, index) => (
        <div className="editable-photo-grid__item" key={`${image}-${index}`}>
          <img src={image} alt={`${alt} foto ${index + 1}`} />
          <button className="editable-photo-grid__remove" onClick={() => onRemove(index)} type="button" aria-label={`Foto ${index + 1} verwijderen`}>
            <Trash2 aria-hidden="true" size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
