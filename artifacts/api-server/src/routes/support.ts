import { Router } from "express";
import { db, supportTicketsTable } from "@workspace/db";
import nodemailer from "nodemailer";

const router = Router();

router.post("/support", async (req, res) => {
  const { userId, email, motivo, mensaje } = req.body;
  if (!userId || !email || !motivo || !mensaje) return res.status(400).json({ error: "Missing fields" });

  try {
    // 1. Guardar en Base de Datos
    await db.insert(supportTicketsTable).values({ userId, email, motivo, mensaje });

    // 2. Enviar Email (Solo si las variables de entorno están configuradas)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      await transporter.sendMail({
        from: `"Do it! App" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Te lo envías a ti mismo
        replyTo: email, // Si le das a "Responder" en Gmail, le responderás al usuario
        subject: `[Soporte Do it!] ${motivo.toUpperCase()} - ${email}`,
        text: `Usuario: ${email} (ID: ${userId})\nMotivo: ${motivo}\n\nMensaje:\n${mensaje}`
      });
    }

    res.status(201).json({ success: true });
  } catch (error: any) {
    req.log.error({ err: error }, "Error processing support ticket");
    res.status(500).json({ error: error.message });
  }
});

export default router;