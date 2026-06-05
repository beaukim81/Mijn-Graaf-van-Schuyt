import type { ReactNode } from "react";
import { useSignedUrl } from "../lib/storageUrls";

interface StorageLinkProps {
  children: ReactNode;
  className?: string;
  download?: boolean;
  href: string;
}

export function StorageLink({ children, className, download, href }: StorageLinkProps) {
  const resolvedUrl = useSignedUrl(href);

  return (
    <a className={className} download={download} href={resolvedUrl} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
