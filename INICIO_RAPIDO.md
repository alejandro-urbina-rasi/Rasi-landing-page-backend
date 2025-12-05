# 🚀 Inicio Rápido - Implementación ePayco

**¿Primera vez implementando ePayco?** Esta guía te ayudará a navegar la documentación.

---

## 📚 Documentación Disponible

### Para Desarrolladores

| Documento | Cuándo usarlo | Tiempo estimado |
|-----------|---------------|-----------------|
| **[INICIO_RAPIDO.md](./INICIO_RAPIDO.md)** (este archivo) | Primera vez implementando | 5 min lectura |
| **[README.md](./README.md)** | Referencia rápida del proyecto | 10 min lectura |
| **[GUIA_IMPLEMENTACION_EPAYCO.md](./GUIA_IMPLEMENTACION_EPAYCO.md)** | Implementación completa paso a paso | 2-3 horas lectura |
| **[CHECKLIST_IMPLEMENTACION.md](./CHECKLIST_IMPLEMENTACION.md)** | Durante la implementación | Uso continuo |
| **[DIAGRAMA_FLUJO.md](./DIAGRAMA_FLUJO.md)** | Entender arquitectura y flujo | 15 min lectura |

---

## 🎯 ¿Por dónde empezar?

### Escenario 1: "Soy nuevo, nunca he trabajado con ePayco"

1. **Leer:** [INICIO_RAPIDO.md](./INICIO_RAPIDO.md) (este archivo) - 5 min
2. **Leer:** [DIAGRAMA_FLUJO.md](./DIAGRAMA_FLUJO.md) - 15 min
   - Entender el flujo completo del sistema
   - Ver cómo interactúan frontend, backend y ePayco
3. **Leer:** [GUIA_IMPLEMENTACION_EPAYCO.md](./GUIA_IMPLEMENTACION_EPAYCO.md) - 2 horas
   - Seguir paso a paso desde configuración de cuenta
   - Implementar backend completo
   - Implementar frontend completo
4. **Usar:** [CHECKLIST_IMPLEMENTACION.md](./CHECKLIST_IMPLEMENTACION.md)
   - Ir marcando cada paso completado
   - Verificar que no se omitió nada

**Tiempo total estimado:** 4-6 horas (lectura + implementación)

---

### Escenario 2: "Ya tengo el proyecto, necesito entender cómo funciona"

1. **Leer:** [README.md](./README.md) - 10 min
   - Ver características del proyecto
   - Entender la estructura de carpetas
2. **Leer:** [DIAGRAMA_FLUJO.md](./DIAGRAMA_FLUJO.md) - 15 min
   - Comprender el flujo de datos
   - Ver cómo se procesa un pago
3. **Explorar código:**
   - `src/config/epayco.js` - Configuración de ePayco
   - `src/controllers/paymentController.js` - Lógica de pagos
   - `src/services/emailService.js` - Envío de emails

**Tiempo total estimado:** 1-2 horas

---

### Escenario 3: "Necesito hacer deploy a producción"

1. **Revisar:** [GUIA_IMPLEMENTACION_EPAYCO.md](./GUIA_IMPLEMENTACION_EPAYCO.md)
   - Ir a sección "Despliegue a Producción"
2. **Seguir:** [CHECKLIST_IMPLEMENTACION.md](./CHECKLIST_IMPLEMENTACION.md)
   - Sección "Fase 5: Despliegue a Producción"
   - Marcar cada ítem del checklist
3. **Verificar:** Variables de entorno de producción
   - `NODE_ENV=production`
   - `EPAYCO_TEST_MODE=false`
   - Credenciales de producción
   - URLs de producción

**Tiempo total estimado:** 2-3 horas (configuración + testing)

---

### Escenario 4: "Algo no funciona, necesito debugging"

1. **Revisar:** [GUIA_IMPLEMENTACION_EPAYCO.md](./GUIA_IMPLEMENTACION_EPAYCO.md)
   - Sección "Troubleshooting"
2. **Verificar logs del backend:**
   ```bash
   # Buscar errores
   npm run dev | grep "❌"

   # Buscar webhooks
   npm run dev | grep "📥"
   ```
3. **Verificar consola del navegador:**
   - Errores de JavaScript
   - Errores de red (Network tab)
4. **Usar:** [CHECKLIST_IMPLEMENTACION.md](./CHECKLIST_IMPLEMENTACION.md)
   - Revisar que todo esté configurado correctamente

---

## ⚡ Setup Rápido (5 minutos)

### Backend

```bash
# 1. Instalar dependencias
cd RASI-Landing-Page-Backend
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Iniciar servidor
npm run dev
```

### Frontend

```bash
# 1. Instalar dependencias
cd RASI-Landing-Page-Frontend
npm install

# 2. Configurar variables de entorno
echo "VITE_API_URL=http://localhost:3000" > .env

# 3. Iniciar servidor
npm run dev
```

### Verificación

1. **Backend:** Abrir http://localhost:3000/api/status
   - Debe retornar: `{"status":"OK","timestamp":"..."}`

2. **Frontend:** Abrir http://localhost:5173
   - Debe cargar la landing page sin errores

3. **Probar flujo:**
   - Seleccionar un plan
   - Llenar formulario
   - Verificar que se abre el modal de ePayco

---

## 🔑 Credenciales Requeridas

Antes de empezar, asegúrate de tener:

### ePayco
- [ ] Public Key (`P_CUST_ID_CLIENTE`)
- [ ] Private Key (`P_KEY`)
- [ ] Cuenta verificada en dashboard.epayco.co

### Google Sheets
- [ ] Sheet ID (de la URL del Google Sheet)
- [ ] `google-credentials.json` (Service Account)
- [ ] Service Account tiene acceso al sheet

### Email (Gmail)
- [ ] Dirección de email
- [ ] App Password (no contraseña normal)
- [ ] 2FA habilitado en la cuenta

### SaaS API (opcional, para Rasi Assistant)
- [ ] URL de la API
- [ ] URL del frontend
- [ ] Endpoint de registro disponible

---

## 📖 Glosario de Términos

| Término | Significado |
|---------|-------------|
| **Smart Checkout** | Modal de pago de ePayco que se abre en iframe |
| **Webhook** | Petición POST automática de ePayco al backend cuando hay un pago |
| **sessionId** | ID único de sesión de checkout generado por ePayco |
| **invoice** | Número de factura único generado por el backend |
| **ref_payco** | Referencia de transacción de ePayco |
| **x_signature** | Firma SHA256 para validar la autenticidad del webhook |
| **x_response** | Estado del pago: "Aceptada", "Rechazada", "Pendiente" |
| **extra1-6** | Campos personalizados enviados a ePayco y devueltos en webhook |
| **Public Key** | Clave pública de ePayco (se usa en frontend) |
| **Private Key** | Clave privada de ePayco (solo backend, NUNCA en frontend) |
| **Service Account** | Cuenta de servicio de Google para acceso a Sheets API |

---

## 🎓 Conceptos Clave

### 1. Flujo de Pago Simplificado

```
Usuario → Frontend → Backend → ePayco → Backend (webhook) → Procesamiento
```

### 2. Dos Tipos de Respuesta

**Respuesta al navegador:**
- Se muestra al usuario inmediatamente
- Solo para mostrar mensaje de éxito/error
- **NO es confiable** (usuario puede cerrar pestaña)

**Webhook al servidor:**
- Llega automáticamente al backend
- **Este es el importante** ✅
- Se usa para procesar el pago real

### 3. Validaciones de Seguridad

1. **Validación de IP:** Solo IPs oficiales de ePayco
2. **Validación de firma:** Firma SHA256 para verificar autenticidad
3. **Rate limiting:** Prevenir abuso
4. **CORS:** Solo permitir origen del frontend

### 4. Sistema de Reintentos

Si algo falla (webhook, email, etc.), el sistema automáticamente reintenta:
- **Webhooks:** 3 reintentos con backoff exponencial
- **Emails:** 5 reintentos cada 5 minutos

---

## 🧪 Tarjetas de Prueba

### Tarjeta Aprobada ✅
```
Número: 4575623182290326
CVV: 123
Fecha: 12/25
```

### Tarjeta Rechazada ❌
```
Número: 4151611527583283
CVV: 123
Fecha: 12/25
```

**Nota:** Estas tarjetas solo funcionan en modo de prueba (`EPAYCO_TEST_MODE=true`)

---

## 🆘 Ayuda Rápida

### ❌ "El modal de ePayco no abre"

**Posibles causas:**
1. Script de ePayco no cargó
2. Public Key incorrecta
3. sessionId inválido

**Solución:**
```javascript
// Verificar en consola del navegador:
console.log(window.ePayco); // Debe existir

// Verificar sessionId en respuesta del backend
```

---

### ❌ "No llega el webhook"

**Posibles causas:**
1. URL de confirmación incorrecta
2. Backend no accesible desde internet
3. Validación de IP bloqueando

**Solución:**
1. Usar ngrok en desarrollo: `ngrok http 3000`
2. Actualizar `EPAYCO_CONFIRMATION_URL` en .env
3. Temporalmente: `VALIDATE_IP=false` (solo desarrollo)

---

### ❌ "Firma inválida"

**Posibles causas:**
1. Private Key incorrecta
2. Datos alterados

**Solución:**
```javascript
// Verificar Private Key en .env
console.log(process.env.EPAYCO_PRIVATE_KEY);

// Ver logs del backend para comparar firmas
```

---

### ❌ "Email no se envía"

**Posibles causas:**
1. App Password incorrecto
2. 2FA no habilitado
3. Puerto bloqueado

**Solución:**
1. Gmail → Seguridad → App Passwords → Generar nueva
2. Probar puerto 587 y 465
3. Verificar `EMAIL_PASSWORD` en .env

---

## 📞 Soporte

### Documentación Oficial
- **ePayco:** https://docs.epayco.co
- **Dashboard:** https://dashboard.epayco.co

### Equipo de Desarrollo
- **Email:** desarrollo@rasi.com.co
- **Docs internas:** Ver archivos en este directorio

### Recursos Útiles
- [Postman Collection ePayco](https://www.postman.com/epayco)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Nodemailer Docs](https://nodemailer.com)

---

## ✅ Próximos Pasos

Ahora que leíste esta guía:

1. **Decide tu escenario** (1, 2, 3 o 4 de arriba)
2. **Lee el documento correspondiente**
3. **Usa el checklist** mientras implementas
4. **Prueba con tarjetas de prueba**
5. **Deploy a producción** cuando esté listo

---

**¡Éxito con tu implementación! 🚀**

---

**Última actualización:** Diciembre 2025
**Autor:** Equipo Rasi Soluciones
