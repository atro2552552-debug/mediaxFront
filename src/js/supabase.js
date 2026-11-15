import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const bucketName = "files";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function uploadFile(file, folder) {
  if (!supabase) {
    throw new Error("Add the Supabase project URL and publishable key to frontend/.env.local.");
  }

  const fileName = Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = folder + "/" + fileName;
  const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
    contentType: file.type
  });

  if (error) throw error;

  return supabase.storage.from(bucketName).getPublicUrl(data.path).data.publicUrl;
}
