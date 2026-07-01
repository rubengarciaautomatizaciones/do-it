import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

router.post("/webhooks/new-user", async (req, res) => {
  const { email, name } = req.body;

  // Seguridad básica: si no hay email, no hacemos nada
  if (!email) return res.status(400).json({ error: "Missing email" });

  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      const fecha = new Intl.DateTimeFormat('es-ES', { 
        timeZone: 'Europe/Madrid', 
        dateStyle: 'full', 
        timeStyle: 'long' 
      }).format(new Date());

      await transporter.sendMail({
        from: `"Do it! App" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // Te lo envías a ti mismo
        subject: `🎉 Nuevo usuario en Do it!`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #111111;">¡Alguien se ha registrado! 🚀</h2>
            <p><strong>Nombre:</strong> ${name || 'No especificado'}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
          </div>
        `
      });
    }
    res.status(200).json({ success: true });
  } catch (error: any) {
    req.log.error({ err: error }, "Error sending new user email");
    res.status(500).json({ error: error.message });
  }
});

export default router;