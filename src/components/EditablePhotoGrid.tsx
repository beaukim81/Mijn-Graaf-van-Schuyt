import { Trash2 } from "lucide-react";
import { PhotoGrid } from "./PhotoGrid";

interface EditablePhotoGridProps {
  images: string[];
  alt: string;
  onRemove: (index: number) => void;
}

export function EditablePhotoGrid({ images, alt, onRemove }: EditablePhotoGridProps) {
  if (images.length === 0) return null;

  return (
    <div className="editable-photo-grid">
      <PhotoGrid images={images} alt={alt} />
      <div className="editable-photo-grid__actions">
        {images.map((image, index) => (
          <button className="button button--danger" key={`${image}-${index}`} onClick={() => onRemove(index)} type="button">
            <Trash2 aria-hidden="true" size={16} /> Foto {index + 1} verwijderen
          </button>
        ))}
      </div>
    </div>
  );
}
