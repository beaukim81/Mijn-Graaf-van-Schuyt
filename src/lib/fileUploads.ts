import { isSupabaseConfigured, supabase } from "./supabase";
import { toStorageReference } from "./storageUrls";

const bulletinImageBucket = "bulletin-images";
const knowledgeFileBucket = "knowledge-files";
const maxOriginalImageBytes = 25 * 1024 * 1024;
const maxPdfBytes = 25 * 1024 * 1024;
const maxImageDimension = 1600;
const imageQuality = 0.82;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("De foto openen lukt niet. Kies de foto opnieuw of probeer een andere foto."));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File) {
  if (file.size > maxOriginalImageBytes) {
    throw new Error("Deze foto is erg groot. Kies een foto kleiner dan 25 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxImageDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("De foto verkleinen lukt niet. Kies een andere foto.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("De foto voorbereiden lukt niet. Kies een andere foto."));
    }, "image/jpeg", imageQuality);
  });

  const safeBaseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase() || "foto";
  return new File([blob], `${safeBaseName}.jpg`, { type: "image/jpeg" });
}

async function prepareImage(file: File) {
  try {
    return await compressImage(file);
  } catch (error) {
    console.error(error);
    if (file.size > maxOriginalImageBytes) throw error;
    return file;
  }
}

export async function uploadBulletinImage(file: File, userId: string) {
  const preparedFile = await prepareImage(file);
  const safeName = preparedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  if (!isSupabaseConfigured || !supabase) {
    return fileToDataUrl(preparedFile);
  }

  const { error } = await supabase.storage.from(bulletinImageBucket).upload(path, preparedFile, {
    cacheControl: "31536000",
    contentType: preparedFile.type || "image/jpeg",
    upsert: false,
  });

  if (error) {
    console.error(error);
    return fileToDataUrl(preparedFile);
  }

  return toStorageReference(bulletinImageBucket, path);
}

export async function uploadBulletinImages(files: File[], userId: string) {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadBulletinImage(file, userId));
  }
  return urls.filter(Boolean);
}

export async function uploadKnowledgePdf(file: File, userId: string) {
  if (file.size > maxPdfBytes) {
    throw new Error("Dit PDF-bestand is te groot. Kies een bestand kleiner dan 25 MB.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  if (!isSupabaseConfigured || !supabase) {
    return fileToDataUrl(file);
  }

  const { error } = await supabase.storage.from(knowledgeFileBucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: "application/pdf",
    upsert: false,
  });

  if (error) {
    throw new Error("Het PDF-bestand uploaden lukt niet. Controleer je verbinding en probeer het opnieuw.");
  }

  return toStorageReference(knowledgeFileBucket, path);
}
