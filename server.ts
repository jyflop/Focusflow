import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  // API Route for file uploads
  app.post('/api/upload', upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, name: req.file.originalname });
  });

  // Socket.io for real-time signaling (typing, online status)
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their personal room`);
    });

    socket.on('typing', ({ conversationId, userId, receiverId }) => {
      socket.to(receiverId).emit('typing', { conversationId, userId });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // API Route for sending actual emails
  app.post('/api/send-invite', async (req, res) => {
    const { email, name, position, inviteLink, senderName, senderEmail } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    // SMTP Configuration from App Environment
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // If no SMTP config, we can't send a real email
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('SMTP configuration missing in Environment Variables.');
      return res.status(401).json({ 
        error: 'Email service not configured. Please add SMTP credentials to App Secrets.',
        missingConfig: true
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"${senderName} via FocusFlow" <${smtpUser}>`,
        replyTo: senderEmail,
        to: email,
        subject: `${senderName} invited you to join FocusFlow`,
        text: `Hi ${name || 'there'},\n\nI'd like to invite you to join our project management team on FocusFlow as a ${position || 'Member'}.\n\nJoin here: ${inviteLink}\n\nBest regards,\n${senderName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="background-color: #4f46e5; width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; line-height: 48px; text-align: center;">F</div>
            </div>
            <h2 style="color: #1e293b; margin-top: 0; text-align: center;">Team Invitation</h2>
            <p style="color: #475569; line-height: 1.6;">Hi <strong>${name || 'there'}</strong>,</p>
            <p style="color: #475569; line-height: 1.6;"><strong>${senderName}</strong> has invited you to join the team on FocusFlow as a <strong>${position || 'Member'}</strong>.</p>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">Join the Team</a>
            </div>
            <p style="color: #64748b; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
              Sent by ${senderName} (${senderEmail})<br>
              FocusFlow Project Management
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error) {
      console.error('Nodemailer Error:', error);
      res.status(500).json({ error: 'Failed to send email. Check SMTP credentials.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
