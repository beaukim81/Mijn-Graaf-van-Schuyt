import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";

const signedUrlTtlSeconds = 60 * 60;

interface StorageReference {
  bucket: string;
  path: string;
}

export function toStorageReference(bucket: string, path: string) {
  return `storage://${bucket}/${path}`;
}

function parseStorageReference(value: string): StorageReference | null {
  if (!value) return null;
  if (value.startsWith("storage://")) {
    const withoutScheme = value.slice("storage://".length);
    const slashIndex = withoutScheme.indexOf("/");
    if (slashIndex <= 0) return null;
    return {
      bucket: withoutScheme.slice(0, slashIndex),
      path: withoutScheme.slice(slashIndex + 1),
    };
  }

  if (!value.includes("/storage/v1/object/")) return null;

  try {
    const url = new URL(value);
    const publicPrefix = "/storage/v1/object/public/";
    const signedPrefix = "/storage/v1/object/sign/";
    const matchingPrefix = url.pathname.includes(publicPrefix) ? publicPrefix : signedPrefix;
    const [, remainder = ""] = url.pathname.split(matchingPrefix);
    const slashIndex = remainder.indexOf("/");
    if (slashIndex <= 0) return null;
    return {
      bucket: decodeURIComponent(remainder.slice(0, slashIndex)),
      path: decodeURIComponent(remainder.slice(slashIndex + 1)),
    };
  } catch {
    return null;
  }
}

export async function resolveStorageUrl(value: string) {
  const reference = parseStorageReference(value);
  if (!reference || !isSupabaseConfigured || !supabase) return value;

  const { data, error } = await supabase.storage
    .from(reference.bucket)
    .createSignedUrl(reference.path, signedUrlTtlSeconds);

  if (error || !data?.signedUrl) return value;
  return data.signedUrl;
}

export function useSignedUrl(value?: string) {
  const [resolvedUrl, setResolvedUrl] = useState(value ?? "");

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setResolvedUrl("");
      return;
    }

    resolveStorageUrl(value).then((url) => {
      if (!cancelled) setResolvedUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return resolvedUrl;
}

export function useSignedUrls(values: string[]) {
  const stableValues = useMemo(() => values.filter(Boolean), [values]);
  const [resolvedUrls, setResolvedUrls] = useState(stableValues);

  useEffect(() => {
    let cancelled = false;
    Promise.all(stableValues.map(resolveStorageUrl)).then((urls) => {
      if (!cancelled) setResolvedUrls(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [stableValues]);

  return resolvedUrls;
}
