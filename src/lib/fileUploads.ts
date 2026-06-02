import { isSupabaseConfigured, supabase } from "./supabase";

const bulletinImageBucket = "bulletin-images";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Foto lezen is niet gelukt."));
    reader.readAsDataURL(file);
  });
}

export async function uploadBulletinImage(file: File, userId: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  if (!isSupabaseConfigured || !supabase) {
    return fileToDataUrl(file);
  }

  const { error } = await supabase.storage.from(bulletinImageBucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    throw new Error(`Foto uploaden is niet gelukt: ${error.message}`);
  }

  const { data } = supabase.storage.from(bulletinImageBucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadBulletinImages(files: File[], userId: string) {
  return Promise.all(files.map((file) => uploadBulletinImage(file, userId)));
}
