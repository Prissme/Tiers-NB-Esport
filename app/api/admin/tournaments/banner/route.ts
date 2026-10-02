// EMPLACEMENT : app/api/admin/tournaments/banner/route.ts  (upload bannière)
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../../src/lib/supabase/admin";
import { isAdminAuthenticated } from "../../../../../src/lib/admin/auth";

export const dynamic = "force-dynamic";

const BUCKET = "tournament-banners";
const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }
    const extension = EXTENSIONS[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Format non supporté (PNG, JPG, WEBP ou GIF)." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image trop lourde (4 Mo maximum)." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const path = `${Date.now()}-${randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) {
      return NextResponse.json(
        { error: `Upload impossible : ${error.message}. Tu peux aussi coller une URL d'image.` },
        { status: 500 }
      );
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload banner." },
      { status: 500 }
    );
  }
}
