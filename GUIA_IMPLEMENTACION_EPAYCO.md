# 📘 Guía de Implementación: ePayco Smart Checkout

**Proyecto:** RASI Landing Page con Pasarela de Pago
**Versión:** 1.0
**Última actualización:** Diciembre 2025

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Requisitos Previos](#requisitos-previos)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Configuración de ePayco](#configuración-de-epayco)
5. [Implementación Backend](#implementación-backend)
6. [Implementación Frontend](#implementación-frontend)
7. [Sistema de Webhooks](#sistema-de-webhooks)
8. [Seguridad](#seguridad)
9. [Testing](#testing)
10. [Despliegue a Producción](#despliegue-a-producción)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Introducción

Esta guía documenta la implementación completa de **ePayco Smart Checkout** en una aplicación web full-stack con Node.js y React.

### ¿Qué incluye esta implementación?

- ✅ Checkout modal integrado en el frontend
- ✅ Backend con validación de pagos y webhooks
- ✅ Sistema de reintentos automáticos
- ✅ Registro de transacciones en Google Sheets
- ✅ Envío de emails de confirmación
- ✅ Manejo de múltiples productos/servicios
- ✅ Soporte para pagos mensuales y anuales con descuentos
- ✅ Seguridad: validación de IPs, firmas, rate limiting

---

## 📦 Requisitos Previos

### 1. Cuenta de ePayco

1. Crear cuenta en [ePayco Dashboard](https://dashboard.epayco.co)
2. Verificar cuenta (documentación de identidad)
3. Obtener credenciales en **Configuración → API Keys**:
   - `P_CUST_ID_CLIENTE` (Public Key)
   - `P_KEY` (Private Key)

### 2. Stack Tecnológico

**Backend:**
- Node.js v18+
- Express 4.18+
- Dependencias clave:
  - `axios` - Peticiones HTTP
  - `crypto` - Validación de firmas
  - `nodemailer` - Envío de emails
  - `googleapis` - Google Sheets API
  - `helmet` - Seguridad HTTP
  - `express-rate-limit` - Rate limiting
  - `cors` - Cross-Origin Resource Sharing

**Frontend:**
- React 18+
- Vite 4+ (build tool)
- Tailwind CSS (opcional, para estilos)

### 3. Servicios Adicionales

- **Google Cloud Console** - Para Google Sheets API
- **Servicio SMTP** - Gmail (con App Password) o similar
- **Ngrok** (desarrollo) - Para exponer localhost a webhooks

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Pricing   │───▶│   Checkout   │───▶│  ePayco Script   │   │
│  │   Plans    │    │    Modal     │    │  (Smart Checkout)│   │
│  └────────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (POST /api/payment/create)
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                   │
│                                                                   │
│  ┌────────────────┐    ┌──────────────────────────────────┐    │
│  │  Payment       │───▶│  ePayco API (Checkout Session)   │    │
│  │  Controller    │◀───│  https://checkout.epayco.co      │    │
│  └────────────────┘    └──────────────────────────────────┘    │
│          │                                                       │
│          │ (Usuario completa pago en ePayco)                    │
│          ▼                                                       │
│  ┌────────────────┐    ┌──────────────────────────────────┐    │
│  │  Webhook       │◀───│  ePayco Webhook (POST)           │    │
│  │  Handler       │    │  /api/payment/webhooks/epayco    │    │
│  └────────────────┘    └──────────────────────────────────┘    │
│          │                                                       │
│          ├───▶ Google Sheets (registro de pago)                 │
│          ├───▶ Nodemailer (email confirmación)                  │
│          └───▶ SaaS API (registro de usuario, si aplica)        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuración de ePayco

### Paso 1: Configurar URLs de respuesta en ePayco Dashboard

1. Ir a **Dashboard → Configuración → URLs de respuesta**
2. Configurar las siguientes URLs:

**Desarrollo (con ngrok):**
```
URL de Respuesta: https://tu-ngrok-url.ngrok-free.dev/payment-response
URL de Confirmación: https://tu-ngrok-url.ngrok-free.dev/api/payment/webhooks/epayco
```

**Producción:**
```
URL de Respuesta: https://tudominio.com/payment-response
URL de Confirmación: https://api.tudominio.com/api/payment/webhooks/epayco
```

### Paso 2: Obtener IPs de ePayco

Las IPs desde las cuales ePayco envía webhooks son:
```
190.242.108.33
190.242.108.34
181.143.155.106
181.143.155.107
```

> ⚠️ **Importante:** Estas IPs deben estar en tu whitelist para validar webhooks.

---

## 🔧 Implementación Backend

### Paso 1: Estructura de Carpetas

```
RASI-Landing-Page-Backend/
├── src/
│   ├── config/
│   │   ├── epayco.js                 # Configuración de ePayco
│   │   └── services.js               # Catálogo de servicios
│   ├── controllers/
│   │   └── paymentController.js      # Lógica de pagos
│   ├── middleware/
│   │   ├── rateLimiter.js            # Rate limiting
│   │   └── validateEpaycoIP.js       # Validación de IPs
│   ├── routes/
│   │   └── payment.js                # Rutas de pago
│   ├── services/
│   │   ├── emailService.js           # Envío de emails
│   │   ├── googleSheetsService.js    # Google Sheets
│   │   └── saasRegistrationService.js # Registro en SaaS
│   ├── utils/
│   │   ├── currencyConverter.js      # Conversión USD → COP
│   │   ├── epaycoSignature.js        # Validación de firmas
│   │   ├── webhookQueue.js           # Cola de reintentos
│   │   ├── orderCleanup.js           # Limpieza de órdenes
│   │   └── errorCompensation.js      # Compensación transaccional
│   └── server.js                     # Servidor principal
├── .env                              # Variables de entorno
├── .env.example                      # Ejemplo de variables
├── package.json
└── google-credentials.json           # Credenciales de Google
```

### Paso 2: Instalar Dependencias

```bash
cd RASI-Landing-Page-Backend
npm install express cors helmet dotenv axios nodemailer googleapis express-rate-limit node-cache
```

### Paso 3: Configurar Variables de Entorno

Crear archivo `.env`:

```env
# Entorno
NODE_ENV=development
PORT=3000

# Seguridad
VALIDATE_SIGNATURE=true
VALIDATE_IP=true
DISABLE_RATE_LIMIT=false

# ePayco Credentials
EPAYCO_PUBLIC_KEY=tu_public_key_aqui
EPAYCO_PRIVATE_KEY=tu_private_key_aqui
EPAYCO_APIFY_URL=https://apify.epayco.co
EPAYCO_TEST_MODE=true
EPAYCO_CURRENCY=COP

# URLs de respuesta
FRONTEND_URL=http://localhost:5173
EPAYCO_RESPONSE_URL=https://tu-ngrok.ngrok-free.dev/payment-response
EPAYCO_CONFIRMATION_URL=https://tu-ngrok.ngrok-free.dev/api/payment/webhooks/epayco

# Google Sheets
GOOGLE_SHEET_ID=tu_sheet_id
GOOGLE_CREDENTIALS_PATH=./google-credentials.json

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password
EMAIL_FROM=Tu Nombre <tu_email@gmail.com>

# Descuentos
ANNUAL_DISCOUNT_PERCENTAGE=10
DEFAULT_USD_COP_RATE=3763.85
```

### Paso 4: Configurar ePayco (`src/config/epayco.js`)

```javascript
const axios = require('axios');
const crypto = require('crypto');

/**
 * Crear sesión de checkout en ePayco
 */
async function createCheckoutSession(data) {
  const {
    name,
    description,
    invoice,
    currency,
    amount,
    taxBase,
    tax,
    country,
    email,
    phone,
    typePerson,
    methodConfirmation
  } = data;

  const payload = {
    name,
    description,
    invoice,
    currency,
    amount: amount.toString(),
    tax_base: taxBase.toString(),
    tax: tax.toString(),
    country,
    lang: 'es',
    external: 'false',
    extra1: data.extra1 || '',
    extra2: data.extra2 || '',
    extra3: data.extra3 || '',
    extra4: data.extra4 || '',
    extra5: data.extra5 || '',
    extra6: data.extra6 || '',
    response: process.env.EPAYCO_RESPONSE_URL,
    confirmation: process.env.EPAYCO_CONFIRMATION_URL,
    name_billing: data.name_billing || name,
    email_billing: email,
    type_person: typePerson,
    mobilephone_billing: phone,
    method_confirmation: methodConfirmation || 'POST',
    public_key: process.env.EPAYCO_PUBLIC_KEY,
    test: process.env.EPAYCO_TEST_MODE === 'true'
  };

  try {
    const response = await axios.post(
      'https://checkout.epayco.co/checkout/api/v2/session',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error creando sesión de checkout:', error.response?.data || error.message);
    throw new Error('Error al crear sesión de pago');
  }
}

module.exports = { createCheckoutSession };
```

### Paso 5: Controlador de Pagos (`src/controllers/paymentController.js`)

**Endpoint para crear sesión de pago:**

```javascript
const { createCheckoutSession } = require('../config/epayco');
const { convertUSDtoCOP } = require('../utils/currencyConverter');
const SERVICES = require('../config/services');

exports.createPaymentSession = async (req, res) => {
  try {
    const { serviceId, billingPeriod, name, email, phone, registrationData } = req.body;

    // Validar datos
    if (!serviceId || !billingPeriod || !email) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Obtener servicio del catálogo
    const service = SERVICES.find(s => s.id === serviceId);
    if (!service) {
      return res.status(400).json({ error: 'Servicio no encontrado' });
    }

    // Calcular precio
    const price = service.prices[billingPeriod];
    if (!price) {
      return res.status(400).json({ error: 'Plan de facturación inválido' });
    }

    // Convertir precio USD → COP
    const priceInCOP = await convertUSDtoCOP(price);
    const taxBase = Math.round(priceInCOP / 1.19);
    const tax = priceInCOP - taxBase;

    // Crear invoice único
    const invoice = `INV-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Preparar datos para ePayco
    const checkoutData = {
      name: service.name,
      description: `${service.name} - Plan ${billingPeriod === 'monthly' ? 'Mensual' : 'Anual'}`,
      invoice,
      currency: 'COP',
      amount: priceInCOP,
      taxBase,
      tax,
      country: 'CO',
      email,
      phone: phone || '3000000000',
      typePerson: 1, // 0=Natural, 1=Jurídica
      methodConfirmation: 'POST',

      // Extras para el webhook
      extra1: serviceId,
      extra2: billingPeriod,
      extra3: name,
      extra4: JSON.stringify(registrationData || {}),
      extra5: new Date().toISOString(),
      extra6: email
    };

    // Crear sesión en ePayco
    const session = await createCheckoutSession(checkoutData);

    res.json({
      success: true,
      sessionId: session.data.sessionId,
      invoice,
      amount: priceInCOP
    });

  } catch (error) {
    console.error('❌ Error en createPaymentSession:', error);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
};
```

### Paso 6: Validación de Webhooks (`src/utils/epaycoSignature.js`)

```javascript
const crypto = require('crypto');

/**
 * Validar firma de webhook de ePayco
 */
function validateEpaycoSignature(data) {
  const {
    x_ref_payco,
    x_transaction_id,
    x_amount,
    x_currency_code,
    x_signature
  } = data;

  const privateKey = process.env.EPAYCO_PRIVATE_KEY;

  const stringToHash = `${privateKey}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`;

  const calculatedSignature = crypto
    .createHash('sha256')
    .update(stringToHash)
    .digest('hex');

  return calculatedSignature === x_signature;
}

module.exports = { validateEpaycoSignature };
```

### Paso 7: Manejo de Webhooks (`src/controllers/paymentController.js`)

```javascript
const { validateEpaycoSignature } = require('../utils/epaycoSignature');
const { assignAssistantCredentials } = require('../services/googleSheetsService');
const { sendAssistantCredentials } = require('../services/emailService');

exports.handleEpaycoWebhook = async (req, res) => {
  try {
    console.log('📥 Webhook recibido de ePayco');

    // 1. Validar firma
    if (process.env.VALIDATE_SIGNATURE === 'true') {
      const isValid = validateEpaycoSignature(req.body);
      if (!isValid) {
        console.error('❌ Firma inválida');
        return res.status(403).json({ error: 'Firma inválida' });
      }
    }

    // 2. Extraer datos
    const {
      x_response,           // Aceptada / Rechazada / Pendiente
      x_approval_code,      // Código de aprobación
      x_transaction_id,     // ID de transacción
      x_ref_payco,          // Referencia de ePayco
      x_amount,             // Monto
      x_extra1,             // serviceId
      x_extra2,             // billingPeriod
      x_extra3,             // name
      x_extra4,             // registrationData (JSON string)
      x_extra5,             // salesDate (ISO string)
      x_extra6              // email
    } = req.body;

    // 3. Verificar estado del pago
    if (x_response !== 'Aceptada') {
      console.log(`⚠️  Pago no aceptado: ${x_response}`);
      return res.status(200).json({ message: 'Pago no aceptado' });
    }

    // 4. Extraer datos adicionales
    const serviceId = x_extra1;
    const billingPeriod = x_extra2;
    const fullName = x_extra3;
    const email = x_extra6;
    const phone = req.body.x_customer_phone || '';
    const salesDate = new Date(x_extra5);

    console.log('✅ Pago aceptado:', {
      servicio: serviceId,
      email,
      monto: x_amount,
      transaccionId: x_transaction_id
    });

    // 5. Procesar según el tipo de servicio
    if (serviceId === 'rasi-assistant') {

      // Registrar datos de registro si existen
      let registrationData = null;
      try {
        registrationData = x_extra4 ? JSON.parse(x_extra4) : null;
      } catch (error) {
        console.warn('⚠️  No se pudo parsear registrationData');
      }

      // Si hay datos de registro, registrar en SaaS
      if (registrationData) {
        const { registerUserInSaaS } = require('../services/saasRegistrationService');
        const saasResult = await registerUserInSaaS(registrationData);

        // Asignar credenciales en Google Sheets
        await assignAssistantCredentials({
          email,
          phone,
          billingPeriod,
          salesDate,
          username: saasResult.credentials.email,
          url: saasResult.credentials.url
        });

        // Enviar email con credenciales
        await sendAssistantCredentials({
          email,
          fullName,
          username: saasResult.credentials.email,
          password: saasResult.credentials.password,
          url: saasResult.credentials.url
        });
      } else {
        // Flujo anterior: buscar credenciales en Google Sheets
        const credentials = await assignAssistantCredentials({
          email,
          phone,
          billingPeriod,
          salesDate
        });

        await sendAssistantCredentials({
          email,
          fullName,
          username: credentials.username,
          password: credentials.password,
          url: credentials.url
        });
      }

    } else if (serviceId === 'rasi-autocitas') {
      const { registerAutocitasPurchase } = require('../services/googleSheetsService');
      const { sendAutocitasConfirmation } = require('../services/emailService');

      await registerAutocitasPurchase({ email, phone, billingPeriod, salesDate });
      await sendAutocitasConfirmation({ email, fullName });

    } else if (serviceId === 'rasi-chatbot') {
      const { registerChatbotPurchase } = require('../services/googleSheetsService');
      const { sendChatbotConfirmation } = require('../services/emailService');

      await registerChatbotPurchase({ email, phone, billingPeriod, salesDate });
      await sendChatbotConfirmation({ email, fullName });
    }

    // 6. Responder a ePayco
    res.status(200).json({ message: 'Webhook procesado exitosamente' });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
};
```

### Paso 8: Rutas (`src/routes/payment.js`)

```javascript
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const rateLimiter = require('../middleware/rateLimiter');
const validateEpaycoIP = require('../middleware/validateEpaycoIP');

// Crear sesión de pago
router.post('/create', rateLimiter.paymentLimiter, paymentController.createPaymentSession);

// Webhook de ePayco (validar IP)
router.post('/webhooks/epayco', validateEpaycoIP, paymentController.handleEpaycoWebhook);

module.exports = router;
```

### Paso 9: Servidor Principal (`src/server.js`)

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (importante para ngrok/CloudFlare)
app.set('trust proxy', true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(helmet());

// Rutas
app.use('/api/payment', require('./routes/payment'));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📝 ePayco webhook en: http://localhost:${PORT}/api/payment/webhooks/epayco`);
});
```

---

## 🎨 Implementación Frontend

### Paso 1: Instalar Script de ePayco en `index.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mi Aplicación</title>

  <!-- Script de ePayco Smart Checkout -->
  <script src="https://checkout.epayco.co/checkout-v2.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

### Paso 2: Componente de Checkout Modal

```javascript
import { useState } from 'react';
import axios from 'axios';

export default function CheckoutModal({ service, billingPeriod, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear sesión en el backend
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await axios.post(`${API_URL}/api/payment/create`, {
        serviceId: service.id,
        billingPeriod,
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });

      const { sessionId } = response.data;

      // 2. Abrir ePayco Smart Checkout
      const handler = window.ePayco.checkout.configure({
        key: import.meta.env.VITE_EPAYCO_PUBLIC_KEY,
        test: import.meta.env.VITE_EPAYCO_TEST_MODE === 'true'
      });

      handler.open({
        sessionId: sessionId,
        external: false,
        autoclick: true
      });

      onClose();

    } catch (error) {
      console.error('Error al procesar pago:', error);
      alert('Error al procesar el pago. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Completar Pago</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre completo</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Pagar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Paso 3: Variables de Entorno Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_EPAYCO_PUBLIC_KEY=tu_public_key_aqui
VITE_EPAYCO_TEST_MODE=true
```

---

## 🔒 Seguridad

### 1. Validación de IPs (`src/middleware/validateEpaycoIP.js`)

```javascript
const EPAYCO_IPS = [
  '190.242.108.33',
  '190.242.108.34',
  '181.143.155.106',
  '181.143.155.107'
];

module.exports = (req, res, next) => {
  if (process.env.VALIDATE_IP === 'false') {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress;

  if (EPAYCO_IPS.includes(clientIP)) {
    next();
  } else {
    console.error('❌ IP no autorizada:', clientIP);
    res.status(403).json({ error: 'IP no autorizada' });
  }
};
```

### 2. Rate Limiting (`src/middleware/rateLimiter.js`)

```javascript
const rateLimit = require('express-rate-limit');

exports.paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 solicitudes por IP
  message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});
```

### 3. Helmet (Seguridad HTTP)

Ya configurado en `server.js` con CSP para permitir scripts de ePayco.

---

## 🧪 Testing

### 1. Tarjetas de Prueba ePayco

**Tarjeta Aprobada:**
```
Número: 4575623182290326
CVV: 123
Fecha: 12/25
```

**Tarjeta Rechazada:**
```
Número: 4151611527583283
CVV: 123
Fecha: 12/25
```

### 2. Probar Webhooks en Desarrollo con Ngrok

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer puerto 3000
ngrok http 3000

# Copiar URL pública (ej: https://abc123.ngrok-free.dev)
# Configurar en ePayco Dashboard y en .env
```

### 3. Testing Manual

1. **Crear pago:** `POST /api/payment/create`
2. **Completar checkout** en modal de ePayco
3. **Verificar webhook:** Revisar logs del servidor
4. **Confirmar registro:** Verificar Google Sheets y email

---

## 🚀 Despliegue a Producción

### Checklist Pre-Despliegue

- [ ] Cambiar `EPAYCO_TEST_MODE=false`
- [ ] Actualizar URLs en ePayco Dashboard
- [ ] Cambiar credenciales de ePayco a producción
- [ ] Activar `VALIDATE_SIGNATURE=true`
- [ ] Activar `VALIDATE_IP=true`
- [ ] Configurar `NODE_ENV=production`
- [ ] Configurar HTTPS (obligatorio)
- [ ] Configurar DNS y SSL
- [ ] Subir `google-credentials.json` como secreto
- [ ] Configurar logs profesionales (Winston/Pino)

### Variables de Entorno Producción

```env
NODE_ENV=production
PORT=3000

VALIDATE_SIGNATURE=true
VALIDATE_IP=true
DISABLE_RATE_LIMIT=false

EPAYCO_PUBLIC_KEY=<produccion_public_key>
EPAYCO_PRIVATE_KEY=<produccion_private_key>
EPAYCO_TEST_MODE=false

FRONTEND_URL=https://tudominio.com
EPAYCO_RESPONSE_URL=https://api.tudominio.com/payment-response
EPAYCO_CONFIRMATION_URL=https://api.tudominio.com/api/payment/webhooks/epayco
```

---

## 🐛 Troubleshooting

### Problema 1: Webhook no se recibe

**Causas:**
- URL de confirmación incorrecta en ePayco Dashboard
- Firewall bloqueando IPs de ePayco
- `VALIDATE_IP=true` en desarrollo local

**Soluciones:**
- Verificar URL en Dashboard
- Usar ngrok en desarrollo
- Temporalmente: `VALIDATE_IP=false` (solo desarrollo)

### Problema 2: Firma inválida

**Causas:**
- Private Key incorrecto
- Formato de datos alterado

**Soluciones:**
- Verificar `EPAYCO_PRIVATE_KEY` en `.env`
- Revisar logs: comparar firma calculada vs recibida

### Problema 3: Modal de ePayco no abre

**Causas:**
- Script no cargado
- Public Key incorrecto
- sessionId inválido

**Soluciones:**
- Verificar `<script src="https://checkout.epayco.co/checkout-v2.js"></script>`
- Verificar `VITE_EPAYCO_PUBLIC_KEY`
- Revisar respuesta de `/api/payment/create`

### Problema 4: Email no se envía

**Causas:**
- Credenciales SMTP incorrectas
- App Password no configurado (Gmail)
- Puerto bloqueado

**Soluciones:**
- Verificar `EMAIL_USER` y `EMAIL_PASSWORD`
- Gmail: Generar App Password (no contraseña normal)
- Probar puerto 587 y 465

---

## 📚 Recursos Adicionales

- [Documentación oficial ePayco](https://docs.epayco.co)
- [Dashboard ePayco](https://dashboard.epayco.co)
- [Postman Collection ePayco](https://www.postman.com/epayco)
- [Google Sheets API](https://developers.google.com/sheets/api)

---

## 📝 Notas Finales

### Buenas Prácticas

1. **Siempre valida firmas en producción**
2. **No expongas credenciales en el frontend**
3. **Usa HTTPS en producción (obligatorio)**
4. **Implementa logs estructurados**
5. **Monitorea transacciones fallidas**
6. **Configura alertas para webhooks fallidos**
7. **Mantén respaldo de transacciones**

### Mantenimiento

- Revisar logs diariamente
- Monitorear tasa de éxito de pagos
- Verificar reintentos de webhooks
- Actualizar dependencias regularmente
- Probar tarjetas de prueba mensualmente

---

**Documentado por:** Equipo de Desarrollo RASI
**Contacto:** desarrollo@rasi.com.co
**Versión:** 1.0 - Diciembre 2025
