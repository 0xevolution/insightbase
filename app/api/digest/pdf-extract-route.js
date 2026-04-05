import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Aucun fichier PDF reçu" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Dynamic import to avoid build issues
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const data = await pdfParse(buffer);

    const text = data?.text?.trim() || "";

    if (!text || text.length < 20) {
      return NextResponse.json({ error: "Impossible d'extraire le texte de ce PDF. Le fichier est peut-être un scan/image." }, { status: 400 });
    }

    return NextResponse.json({
      text: text,
      pages: data.numpages || 0,
      info: data.info || {},
    });
  } catch (e) {
    return NextResponse.json({ error: "Erreur extraction PDF: " + (e.message || "inconnue") }, { status: 500 });
  }
}
