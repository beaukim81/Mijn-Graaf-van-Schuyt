import { X } from "lucide-react";
import { useState } from "react";
import { useSignedUrls } from "../lib/storageUrls";

interface PhotoGridProps {
  images: string[];
  alt: string;
}

export function PhotoGrid({ images, alt }: PhotoGridProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const visibleImages = useSignedUrls(images.slice(0, 10));
  if (images.length === 0) return null;

  return (
    <>
      <div className={`photo-grid photo-grid--${Math.min(visibleImages.length, 4)}`}>
        {visibleImages.map((image, index) => (
          <button className="photo-grid__item" key={`${image}-${index}`} onClick={() => setSelectedImage(image)} type="button">
            <img src={image} alt={`${alt} foto ${index + 1}`} />
          </button>
        ))}
      </div>
      {selectedImage && (
        <div className="photo-viewer" role="dialog" aria-modal="true" aria-label="Foto bekijken">
          <button className="photo-viewer__close" onClick={() => setSelectedImage(null)} type="button" aria-label="Sluiten">
            <X aria-hidden="true" />
          </button>
          <img src={selectedImage} alt={alt} />
        </div>
      )}
    </>
  );
}
