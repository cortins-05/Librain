import { headers } from "next/headers";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { auth } from "@/lib/auth";
import { dbConnect } from "@/db/dbConnect";
import Stored from "@/db/Models/Task/Task.model";

interface RouteContext {
  params: Promise<{ id?: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const params = await context.params;
  const id = typeof params?.id === "string" ? params.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Falta el id de la inquietud" }, { status: 400 });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "El id de la inquietud no es válido" }, { status: 400 });
  }

  try {
    await dbConnect();

    const deleted = await Stored.findOneAndDelete({
      _id: id,
      user: session.user.id,
    });

    if (!deleted) {
      return NextResponse.json({ error: "inquietud no encontrada" }, { status: 404 });
    }
    
    console.log(`🗑️ Tarea eliminada (ID: ${id}). Contenido original limpiado automáticamente.`);

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error("[DELETE /api/task/:id] database error", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
