import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Faltan credenciales de correo o contraseña." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Buscar si el usuario ya existe en Supabase Auth
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const existingUser = listData.users.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (existingUser) {
      // Si el usuario ya existe pero no estaba confirmado o necesita sincronizar su contraseña, lo confirmamos
      if (!existingUser.email_confirmed_at) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
        });
      }
      return NextResponse.json({ ok: true, status: "exists" });
    }

    // Si es la primera vez que ingresa (ej. jairotten84@gmail.com), creamos el usuario auto-confirmado
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, status: "created" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

