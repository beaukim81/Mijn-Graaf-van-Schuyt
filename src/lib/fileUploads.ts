import { isSupabaseConfigured, supabase } from "./supabase";

const bulletinImageBucket = "bulletin-images";
const knowledgeFileBucket = "knowledge-files";
const maxImageBytes = 10 * 1024 * 1024;
const maxPdfBytes = 25 * 1024 * 1024;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("De foto openen lukt niet. Kies de foto opnieuw of probeer een andere foto."));
    reader.readAsDataURL(file);
  });
}

export async function uploadBulletinImage(file: File, userId: string) {
  if (file.size > maxImageBytes) {
    throw new Error("Deze foto is te groot. Kies een foto kleiner dan 10 MB.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  if (!isSupabaseConfigured || !supabase) {
    return fileToDataUrl(file);
  }

  const { error } = await supabase.storage.from(bulletinImageBucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (error) {
    throw new Error("De foto uploaden lukt niet. Controleer je verbinding en probeer het opnieuw.");
  }

  const { data } = supabase.storage.from(bulletinImageBucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadBulletinImages(files: File[], userId: string) {
  const urls = await Promise.all(files.map((file) => uploadBulletinImage(file, userId)));
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

  const { data } = supabase.storage.from(knowledgeFileBucket).getPublicUrl(path);
  return data.publicUrl;
}
