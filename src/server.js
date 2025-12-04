require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { startOrderCleanup } = require('./utils/orderCleanup');
const { initWebhookQueue, startRetryProcessor } = require('./utils/webhookQueue');
const { initCompensationQueues, retryFailedEmails } = require('./utils/errorCompensation');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - IMPORTANTE para ngrok, CloudFlare, y rate limiting
// Permite que Express confíe en headers x-forwarded-* de proxies
app.set('trust proxy', true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// 🔒 Configurar helmet
// En desarrollo, deshabilitamos CSP porque ngrok inyecta sus propios headers
// En producción, usamos CSP completo
if (process.env.NODE_ENV === 'production') {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "data:",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
            "http:",
          ],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://checkout.epayco.co",
          ],
          connectSrc: [
            "'self'",
            "https://checkout.epayco.co",
            "https://secure.epayco.co",
          ],
          frameSrc: [
            "'self'",
            "https://checkout.epayco.co",
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
} else {
  // En desarrollo, solo usar helmet sin CSP para evitar conflictos con ngrok
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
}


// Rutas
app.get('/', (req, res) => {
  res.json({ mensaje: '🎉 Backend Rasi SaaS con ePayco activo' });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// RUTA GLOBAL para respuesta de ePayco
const paymentController = require('./controllers/paymentController');
app.get('/payment-response', paymentController.paymentResponse);
app.post('/payment-response', paymentController.paymentResponse);

// Rutas de pago (API)
app.use('/api/payment', require('./routes/payment'));
app.use('/api', require('./routes/payment'));

// Ruta de contacto
app.use('/api/contact', require('./routes/contact'));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error interno:', err.stack); // Solo errores críticos
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📝 ePayco webhook en: http://localhost:${PORT}/api/payment/webhooks/epayco`);
  console.log(`📄 Payment response en: http://localhost:${PORT}/payment-response`);

  // Iniciar limpieza automática de órdenes pendientes
  startOrderCleanup();
  console.log(`🧹 Sistema de limpieza de órdenes activado`);

  // Iniciar cola de reintentos de webhooks
  initWebhookQueue();
  startRetryProcessor();
  console.log(`🔄 Sistema de reintentos de webhooks activado`);

  // Iniciar sistema de compensación transaccional
  initCompensationQueues();
  console.log(`💾 Colas de compensación inicializadas`);

  // Procesar reintentos de emails cada 5 minutos
  setInterval(async () => {
    console.log('\n🔄 Procesando reintentos de emails fallidos...');
    const result = await retryFailedEmails();
    if (result.success > 0 || result.failed > 0) {
      console.log(`   ✅ Exitosos: ${result.success}, ❌ Fallidos: ${result.failed}`);
    }
  }, 5 * 60 * 1000);
  console.log(`📧 Procesador de reintentos de emails activado (cada 5 minutos)`);
});
