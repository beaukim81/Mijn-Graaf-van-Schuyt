import { LinkifiedText } from "./LinkifiedText";

interface UrlPreviewProps {
  text?: string;
}

const previewUrlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/i;

export function UrlPreview({ text }: UrlPreviewProps) {
  if (!text || !previewUrlPattern.test(text)) return null;

  return (
    <div className="url-preview">
      <span>Linkvoorbeeld</span>
      <p>
        <LinkifiedText text={text} />
      </p>
    </div>
  );
}
