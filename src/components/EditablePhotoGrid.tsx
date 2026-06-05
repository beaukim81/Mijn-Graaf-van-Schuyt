import { Trash2 } from "lucide-react";
import { useConfirm } from "../lib/ConfirmContext";
import { useSignedUrls } from "../lib/storageUrls";

interface EditablePhotoGridProps {
  images: string[];
  alt: string;
  onRemove: (index: number) => void;
}

export function EditablePhotoGrid({ images, alt, onRemove }: EditablePhotoGridProps) {
  const confirm = useConfirm();
  const visibleImages = useSignedUrls(images.slice(0, 10));
  if (images.length === 0) return null;

  return (
    <div className={`editable-photo-grid photo-grid photo-grid--${Math.min(visibleImages.length, 4)}`}>
      {visibleImages.map((image, index) => (
        <div className="editable-photo-grid__item" key={`${image}-${index}`}>
          <img src={image} alt={`${alt} foto ${index + 1}`} />
          <button
            className="editable-photo-grid__remove"
            onClick={async () => {
              const confirmed = await confirm({ confirmLabel: "Foto verwijderen", message: `Weet je zeker dat je foto ${index + 1} wilt verwijderen?` });
              if (confirmed) onRemove(index);
            }}
            type="button"
            aria-label={`Foto ${index + 1} verwijderen`}
          >
            <Trash2 aria-hidden="true" size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
