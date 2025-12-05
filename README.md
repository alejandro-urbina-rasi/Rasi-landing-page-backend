# 🚀 RASI Landing Page - Backend

Backend con Node.js/Express para landing page de productos SaaS con integración de **ePayco Smart Checkout**.

## 📋 Características

- ✅ Integración completa con ePayco (Smart Checkout)
- ✅ Sistema de webhooks con validación de firmas e IPs
- ✅ Reintentos automáticos de webhooks fallidos
- ✅ Registro de transacciones en Google Sheets
- ✅ Envío de emails de confirmación (Nodemailer)
- ✅ Registro automático de usuarios en SaaS
- ✅ Rate limiting y seguridad con Helmet
- ✅ Sistema de compensación transaccional
- ✅ Conversión automática USD → COP

## 🛠️ Stack Tecnológico

- **Runtime:** Node.js 18+
- **Framework:** Express 4.18+
- **Servicios:**
  - ePayco (Pasarela de pago)
  - Google Sheets API (Registro de transacciones)
  - Nodemailer (Emails)
  - Axios (Peticiones HTTP)

## 📦 Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd RASI-Landing-Page-Backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start
```

## ⚙️ Variables de Entorno Requeridas

```env
# Entorno
NODE_ENV=development
PORT=3000

# ePayco
EPAYCO_PUBLIC_KEY=your_public_key
EPAYCO_PRIVATE_KEY=your_private_key
EPAYCO_TEST_MODE=true

# URLs
FRONTEND_URL=http://localhost:5173
EPAYCO_RESPONSE_URL=https://your-domain.com/payment-response
EPAYCO_CONFIRMATION_URL=https://your-domain.com/api/payment/webhooks/epayco

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_CREDENTIALS_PATH=./google-credentials.json

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# SaaS (opcional)
SAAS_API_URL=https://api.your-saas.com
SAAS_FRONTEND_URL=https://your-saas.com
```

## 📁 Estructura del Proyecto

```
src/
├── config/           # Configuraciones (ePayco, servicios)
├── controllers/      # Lógica de negocio
├── middleware/       # Rate limiting, validación de IPs
├── routes/           # Rutas de la API
├── services/         # Servicios externos (email, sheets, SaaS)
├── utils/            # Utilidades (firmas, conversión, colas)
└── server.js         # Punto de entrada
```

## 🔌 Endpoints Principales

### Crear Sesión de Pago
```http
POST /api/payment/create
Content-Type: application/json

{
  "serviceId": "rasi-assistant",
  "billingPeriod": "monthly",
  "name": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "phone": "3001234567",
  "registrationData": { ... }
}
```

### Webhook de ePayco
```http
POST /api/payment/webhooks/epayco
```
> ⚠️ Solo acepta peticiones desde IPs oficiales de ePayco

### Contacto
```http
POST /api/contact
Content-Type: application/json

{
  "name": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "phone": "3001234567",
  "subject": "Consulta",
  "message": "Mensaje aquí"
}
```

## 🔒 Seguridad

### Validación de Firmas
Todos los webhooks de ePayco son validados usando SHA256:
```
SHA256(privateKey^refPayco^transactionId^amount^currency)
```

### Validación de IPs
Solo se aceptan webhooks desde las IPs oficiales de ePayco:
- `190.242.108.33`
- `190.242.108.34`
- `181.143.155.106`
- `181.143.155.107`

### Rate Limiting
- **Pagos:** 10 solicitudes / 15 minutos por IP
- **Webhooks:** Sin límite (validado por IP)
- **Contacto:** 5 solicitudes / 15 minutos por IP

### Headers de Seguridad
Configurados con Helmet:
- Content Security Policy
- XSS Protection
- HSTS (en producción)

## 🧪 Testing

### Desarrollo Local con Ngrok

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer puerto 3000
ngrok http 3000

# Actualizar .env con la URL de ngrok
EPAYCO_CONFIRMATION_URL=https://abc123.ngrok-free.dev/api/payment/webhooks/epayco
```

### Tarjetas de Prueba

**Aprobada:**
```
Número: 4575623182290326
CVV: 123
Fecha: 12/25
```

**Rechazada:**
```
Número: 4151611527583283
CVV: 123
Fecha: 12/25
```

## 📊 Monitoreo

### Logs Estructurados
Todos los eventos importantes se loguean con emojis para fácil identificación:

- `🚀` Servidor iniciado
- `📥` Webhook recibido
- `✅` Operación exitosa
- `❌` Error
- `⚠️` Advertencia
- `🔄` Reintento
- `📧` Email enviado

### Sistema de Reintentos

**Webhooks fallidos:**
- Se encolan automáticamente
- 3 reintentos con backoff exponencial
- Intervalo: 30 segundos

**Emails fallidos:**
- Se guardan en cola de compensación
- Reintentos cada 5 minutos
- Máximo 5 intentos

## 🚀 Despliegue a Producción

### Checklist

- [ ] Cambiar `NODE_ENV=production`
- [ ] Cambiar `EPAYCO_TEST_MODE=false`
- [ ] Actualizar credenciales de ePayco a producción
- [ ] Configurar URLs de producción
- [ ] Activar `VALIDATE_SIGNATURE=true`
- [ ] Activar `VALIDATE_IP=true`
- [ ] Configurar HTTPS (obligatorio)
- [ ] Subir `google-credentials.json` como secreto
- [ ] Configurar variables de entorno en hosting
- [ ] Verificar URLs en ePayco Dashboard

### Proveedores Recomendados

- **Railway** - Node.js hosting + PostgreSQL
- **Vercel** - Serverless functions
- **DigitalOcean** - VPS tradicional
- **AWS EC2** - Escalabilidad empresarial

## 📚 Documentación Completa

Ver [GUIA_IMPLEMENTACION_EPAYCO.md](./GUIA_IMPLEMENTACION_EPAYCO.md) para:
- Guía paso a paso de implementación
- Arquitectura detallada del sistema
- Troubleshooting
- Buenas prácticas

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Proyecto privado - Rasi Soluciones © 2025

## 👥 Equipo

**Desarrollado por:** Equipo Rasi Soluciones
**Contacto:** comercial@rasi.com.co
**Versión:** 1.0.0
