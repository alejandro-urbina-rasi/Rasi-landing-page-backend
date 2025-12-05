# ✅ Checklist de Implementación ePayco

Usa este checklist para verificar que todos los pasos de implementación se completaron correctamente.

---

## 📋 Fase 1: Configuración Inicial

### ePayco Dashboard
- [ ] Cuenta creada en [dashboard.epayco.co](https://dashboard.epayco.co)
- [ ] Cuenta verificada (documentación aprobada)
- [ ] Public Key obtenida
- [ ] Private Key obtenida
- [ ] URL de respuesta configurada
- [ ] URL de confirmación (webhook) configurada
- [ ] Modo de prueba activado para desarrollo

### Google Cloud Console
- [ ] Proyecto creado
- [ ] Google Sheets API habilitada
- [ ] Service Account creada
- [ ] JSON de credenciales descargado
- [ ] Service Account tiene acceso al Google Sheet
- [ ] `google-credentials.json` en raíz del backend

### Email (Gmail)
- [ ] Cuenta de Gmail seleccionada
- [ ] 2FA habilitado
- [ ] App Password generado
- [ ] SMTP probado (puerto 587 o 465)

---

## 📋 Fase 2: Backend

### Dependencias
- [ ] `npm install` ejecutado
- [ ] Todas las dependencias instaladas sin errores
- [ ] `nodemailer` instalado
- [ ] `googleapis` instalado
- [ ] `axios` instalado
- [ ] `express-rate-limit` instalado
- [ ] `helmet` instalado

### Variables de Entorno
- [ ] Archivo `.env` creado desde `.env.example`
- [ ] `EPAYCO_PUBLIC_KEY` configurada
- [ ] `EPAYCO_PRIVATE_KEY` configurada
- [ ] `EPAYCO_TEST_MODE=true`
- [ ] `FRONTEND_URL` configurada
- [ ] `GOOGLE_SHEET_ID` configurada
- [ ] `GOOGLE_CREDENTIALS_PATH` configurada
- [ ] `EMAIL_USER` configurada
- [ ] `EMAIL_PASSWORD` configurada (App Password)
- [ ] `VALIDATE_SIGNATURE=true`
- [ ] `VALIDATE_IP` configurada según ambiente

### Estructura de Archivos
- [ ] `src/config/epayco.js` creado
- [ ] `src/config/services.js` creado
- [ ] `src/controllers/paymentController.js` creado
- [ ] `src/routes/payment.js` creado
- [ ] `src/services/emailService.js` creado
- [ ] `src/services/googleSheetsService.js` creado
- [ ] `src/utils/epaycoSignature.js` creado
- [ ] `src/utils/currencyConverter.js` creado
- [ ] `src/middleware/rateLimiter.js` creado
- [ ] `src/middleware/validateEpaycoIP.js` creado
- [ ] `src/server.js` configurado

### Endpoints
- [ ] `POST /api/payment/create` funcional
- [ ] `POST /api/payment/webhooks/epayco` funcional
- [ ] `POST /api/contact` funcional
- [ ] `GET /api/services` funcional (opcional)
- [ ] `GET /api/status` funcional (health check)

### Seguridad
- [ ] Helmet configurado
- [ ] CORS configurado con origen específico
- [ ] Rate limiting activado
- [ ] Validación de IPs de ePayco implementada
- [ ] Validación de firmas implementada
- [ ] Trust proxy configurado (`app.set('trust proxy', true)`)

### Google Sheets
- [ ] Hoja "Credenciales" creada con columnas correctas
- [ ] Hoja "Autocitas" creada (si aplica)
- [ ] Hoja "Chatbot" creada (si aplica)
- [ ] Headers en fila 1
- [ ] Datos empiezan en fila 2
- [ ] Service Account tiene permisos de edición
- [ ] Test de escritura exitoso

---

## 📋 Fase 3: Frontend

### Dependencias
- [ ] `npm install` ejecutado
- [ ] React 18+ instalado
- [ ] React Router DOM instalado
- [ ] react-i18next instalado
- [ ] react-hot-toast instalado
- [ ] Axios instalado
- [ ] Tailwind CSS configurado

### Variables de Entorno
- [ ] Archivo `.env` creado
- [ ] `VITE_API_URL` configurada

### Script de ePayco
- [ ] Script agregado en `index.html`
- [ ] URL correcta: `https://checkout.epayco.co/checkout-v2.js`
- [ ] Script cargando correctamente (verificar en DevTools)

### Componentes
- [ ] `CheckoutModal.jsx` creado
- [ ] `PricingPlans.jsx` creado
- [ ] `Contact.jsx` creado
- [ ] `PaymentResponse.jsx` creado
- [ ] `Navbar.jsx` con cambio de idioma
- [ ] `Hero.jsx` con CTAs
- [ ] `Footer.jsx` con enlaces

### i18n
- [ ] `src/locales/es.json` creado
- [ ] `src/locales/en.json` creado
- [ ] `src/i18n.js` configurado
- [ ] Import de i18n en `main.jsx`
- [ ] Traducciones funcionando
- [ ] Persistencia en localStorage

### Routing
- [ ] React Router configurado
- [ ] Ruta `/` (Home)
- [ ] Ruta `/nosotros` (AboutUs)
- [ ] Ruta `/contacto` (Contact)
- [ ] Ruta `/payment-response` (PaymentResponse)
- [ ] Scroll automático a hash anchors

### Estilos
- [ ] Tailwind CSS funcionando
- [ ] Responsive en móvil (375px)
- [ ] Responsive en tablet (768px)
- [ ] Responsive en desktop (1920px)
- [ ] Colores del tema aplicados
- [ ] Animaciones suaves

---

## 📋 Fase 4: Testing

### Testing Local

#### Backend
- [ ] Servidor inicia sin errores: `npm run dev`
- [ ] Puerto correcto (3000)
- [ ] Logs estructurados visibles
- [ ] Health check responde: `curl http://localhost:3000/api/status`

#### Frontend
- [ ] Servidor inicia sin errores: `npm run dev`
- [ ] Puerto correcto (5173)
- [ ] Hot reload funciona
- [ ] No hay errores en consola del navegador

### Ngrok (Desarrollo)
- [ ] Ngrok instalado
- [ ] Ngrok corriendo: `ngrok http 3000`
- [ ] URL pública copiada
- [ ] URL en `EPAYCO_CONFIRMATION_URL`
- [ ] URL configurada en ePayco Dashboard

### Flujo de Pago Completo
- [ ] Usuario selecciona plan
- [ ] Modal de checkout se abre
- [ ] Formulario se valida correctamente
- [ ] Backend crea sesión exitosamente
- [ ] Smart Checkout de ePayco se abre
- [ ] Tarjeta de prueba aceptada (4575623182290326)
- [ ] Redirección a `/payment-response`
- [ ] Webhook recibido en backend
- [ ] Logs muestran webhook procesado
- [ ] Datos guardados en Google Sheets
- [ ] Email de confirmación enviado
- [ ] Email recibido en bandeja de entrada

### Tarjetas de Prueba
- [ ] Tarjeta aprobada probada (4575623182290326)
- [ ] Tarjeta rechazada probada (4151611527583283)
- [ ] Estados correctos mostrados en `/payment-response`

### Validaciones de Seguridad
- [ ] Firma inválida rechazada (403)
- [ ] IP no autorizada rechazada (403)
- [ ] Rate limit funciona (429 después de límite)
- [ ] CORS bloquea orígenes no autorizados

### Google Sheets
- [ ] Fila se agrega correctamente
- [ ] Columnas tienen datos correctos
- [ ] Estado cambia de "Disponible" a "Asignado"
- [ ] Fecha con formato correcto (DD/MM/YYYY)
- [ ] "Válido Hasta" calculado correctamente

### Emails
- [ ] Email enviado sin errores
- [ ] Formato HTML correcto
- [ ] Credenciales correctas en email
- [ ] URLs correctas en email
- [ ] Email no va a spam

### Formulario de Contacto
- [ ] Validación funciona
- [ ] Envío exitoso
- [ ] Email llega a destinatario correcto
- [ ] Toast de confirmación se muestra

---

## 📋 Fase 5: Despliegue a Producción

### Pre-Despliegue
- [ ] Build de frontend exitoso: `npm run build`
- [ ] Build preview funciona: `npm run preview`
- [ ] No hay warnings críticos
- [ ] Assets optimizados (< 500KB JS)
- [ ] Imágenes optimizadas
- [ ] `.gitignore` configurado correctamente
- [ ] `.env` NO está en repositorio

### Variables de Producción
- [ ] `NODE_ENV=production`
- [ ] `EPAYCO_TEST_MODE=false`
- [ ] Credenciales de ePayco de producción
- [ ] URLs de producción configuradas
- [ ] `VALIDATE_SIGNATURE=true`
- [ ] `VALIDATE_IP=true`
- [ ] `DISABLE_RATE_LIMIT=false`
- [ ] HTTPS activado (obligatorio)

### ePayco Dashboard (Producción)
- [ ] URLs actualizadas a producción
- [ ] Modo prueba desactivado
- [ ] Credenciales de producción activas
- [ ] Webhooks probados en producción

### Hosting
- [ ] Backend desplegado
- [ ] Frontend desplegado
- [ ] Variables de entorno configuradas en hosting
- [ ] `google-credentials.json` subido como secreto
- [ ] DNS configurado
- [ ] SSL/TLS configurado
- [ ] Dominio apunta a servidor

### Verificación Post-Despliegue
- [ ] Backend accesible: `https://api.tudominio.com`
- [ ] Frontend accesible: `https://tudominio.com`
- [ ] Health check responde: `https://api.tudominio.com/api/status`
- [ ] HTTPS sin warnings
- [ ] Certificado SSL válido
- [ ] CORS funciona correctamente

### Prueba en Producción
- [ ] Realizar pago de prueba (monto bajo)
- [ ] Webhook recibido correctamente
- [ ] Datos guardados en Google Sheets
- [ ] Email enviado
- [ ] Todo funciona sin errores

### Monitoreo
- [ ] Logs estructurados funcionando
- [ ] Alertas configuradas (opcional)
- [ ] Backup de Google Sheets configurado
- [ ] Plan de rollback definido

---

## 📋 Fase 6: Documentación

### Documentación Técnica
- [ ] README.md del backend completo
- [ ] README.md del frontend completo
- [ ] GUIA_IMPLEMENTACION_EPAYCO.md revisada
- [ ] Comentarios en código crítico
- [ ] Diagramas de arquitectura (opcional)

### Documentación de Usuario
- [ ] Guía de uso del dashboard (si aplica)
- [ ] FAQ de problemas comunes
- [ ] Contacto de soporte definido

### Handoff al Equipo
- [ ] Presentación de la implementación
- [ ] Credenciales compartidas de forma segura
- [ ] Acceso a Google Sheets compartido
- [ ] Acceso a ePayco Dashboard compartido
- [ ] Procedimientos de mantenimiento documentados

---

## 📋 Mantenimiento Continuo

### Semanal
- [ ] Revisar logs de errores
- [ ] Verificar tasa de éxito de pagos
- [ ] Revisar webhooks fallidos
- [ ] Verificar emails enviados

### Mensual
- [ ] Actualizar dependencias: `npm outdated`
- [ ] Revisar vulnerabilidades: `npm audit`
- [ ] Probar tarjetas de prueba
- [ ] Backup de Google Sheets
- [ ] Revisar métricas de conversión

### Trimestral
- [ ] Revisar y actualizar documentación
- [ ] Optimizar performance
- [ ] Revisar y mejorar seguridad
- [ ] Auditoría de código

---

## 🚨 Verificación Rápida

### ¿Todo funcionando? Verifica estos 5 puntos:

1. **✅ Backend responde:**
   ```bash
   curl https://api.tudominio.com/api/status
   # Debe retornar: {"status":"OK","timestamp":"..."}
   ```

2. **✅ Frontend carga:**
   - Abrir `https://tudominio.com`
   - No debe haber errores en consola

3. **✅ Pago funciona:**
   - Seleccionar plan
   - Completar checkout
   - Verificar redirección exitosa

4. **✅ Webhook funciona:**
   - Revisar logs del backend
   - Buscar: `✅ Pago aceptado`

5. **✅ Email enviado:**
   - Revisar bandeja de entrada
   - Verificar credenciales correctas en email

---

## 📞 Contacto de Soporte

**En caso de problemas:**
- 📧 Email: desarrollo@rasi.com.co
- 📚 Docs: Ver `GUIA_IMPLEMENTACION_EPAYCO.md`
- 🐛 Bugs: Ver sección Troubleshooting

---

✅ **Checklist completado:** _____ / _____
📅 **Fecha de implementación:** ______________
👤 **Implementado por:** ______________
