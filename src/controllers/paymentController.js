const { createCheckoutSession, getClientIp, extractNameFromEmail } = require('../config/epayco');
const { assignAssistantCredentials, registerAutocitasPurchase, registerChatbotPurchase } = require('../services/googleSheetsService');
const { sendAssistantCredentials, sendAutocitasConfirmation, sendChatbotConfirmation } = require('../services/emailService');
const { registerUserInSaaS, SAAS_API_URL } = require('../services/saasRegistrationService'); // 🆕 Servicio de registro en SaaS
const SERVICES = require('../config/services');
const { convertUSDtoCOP } = require('../utils/currencyConverter');
const { validateEpaycoSignature, validateWebhookIntegrity, logInvalidWebhookAttempt } = require('../utils/epaycoSignature');
const { enqueueWebhook } = require('../utils/webhookQueue');
const {
  registerFailedEmail,
  registerFailedSheetWrite,
  registerPartialTransaction,
  getCompensationStats,
  generateCompensationReport,
  markAsResolved
} = require('../utils/errorCompensation');
const frontend = process.env.FRONTEND_URL;


/**
 * GET /api/payment/services
 * Obtener todos los servicios disponibles
 * Soporta parámetro ?lang=es|en para traducción
 */
exports.getServices = async (req, res) => {
  try {
    const lang = req.query.lang || 'es'; // Default a español

    console.log(`📋 Obteniendo servicios en idioma: ${lang}`);

    const activeServices = Object.values(SERVICES)
      .filter(service => service.active)
      .map(service => {
        // Obtener nombre - si es objeto traducido, usar idioma; si es string, usar directamente
        const name = typeof service.name === 'object' ? service.name[lang] || service.name.es : service.name;

        // Obtener descripción
        const description = typeof service.description === 'object'
          ? service.description[lang] || service.description.es
          : service.description;

        // Obtener features
        const features = Array.isArray(service.features)
          ? service.features
          : (service.features[lang] || service.features.es || []);

        return {
          id: service.id,
          name,
          monthlyPrice: service.monthlyPrice,
          currency: service.currency,
          description,
          features,
          flowType: service.flowType,
          disabled: service.disabled || false
        };
      });

    console.log(`✅ ${activeServices.length} servicios retornados en ${lang}`);
    res.json(activeServices);
  } catch (err) {
    console.error('❌ Error obteniendo servicios:', err);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
};

/**
 * GET /api/payment/services/:serviceId
 * Obtener un servicio específico
 * Soporta parámetro ?lang=es|en para traducción
 */
exports.getService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const lang = req.query.lang || 'es'; // Default a español

    const service = SERVICES[serviceId];

    if (!service || !service.active) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    // Obtener nombre
    const name = typeof service.name === 'object' ? service.name[lang] || service.name.es : service.name;

    // Obtener descripción
    const description = typeof service.description === 'object'
      ? service.description[lang] || service.description.es
      : service.description;

    // Obtener features
    const features = Array.isArray(service.features)
      ? service.features
      : (service.features[lang] || service.features.es || []);

    res.json({
      id: service.id,
      name,
      monthlyPrice: service.monthlyPrice,
      currency: service.currency,
      description,
      features,
      flowType: service.flowType,
      disabled: service.disabled || false
    });
  } catch (err) {
    console.error('❌ Error obteniendo servicio:', err);
    res.status(500).json({ error: 'Error al obtener servicio' });
  }
};


/**
 * POST /api/payment/create-session
 * Crear sesión de pago para servicios Rasi
 * ✅ VALIDACIONES CRÍTICAS DE SEGURIDAD
 */
exports.createSession = async (req, res) => {
  try {
    const {
      serviceId,
      serviceName,
      amount,
      currency = 'COP',
      billingPeriod,
      email,
      fullName,
      phone,
      userId,
      country = 'CO',
      flowType,
      registrationData // 🆕 Datos de registro para flowType='credentials'
    } = req.body;

    console.log('📥 Solicitud recibida:', {
      serviceId,
      serviceName,
      billingPeriod,
      amount,
      email,
      phone,
      flowType,
      hasRegistrationData: !!registrationData
    });

    // ============================================
    // ✅ VALIDACIÓN 1: Datos requeridos
    // ============================================

    if (!serviceId || !serviceName || !amount || !email || !phone || !billingPeriod || !flowType) {
      console.error('❌ Faltan datos requeridos');
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos'
      });
    }

    // ============================================
    // ✅ VALIDACIÓN 2: Servicio existe en backend
    // ============================================

    const service = SERVICES[serviceId];

    if (!service || !service.active) {
      console.warn(`❌ Servicio no encontrado o inactivo: ${serviceId}`);
      return res.status(404).json({
        success: false,
        error: 'Servicio no encontrado',
        code: 'SERVICE_NOT_FOUND'
      });
    }

    // ============================================
    // ✅ VALIDACIÓN 3: Período válido
    // ============================================

    if (!['monthly', 'annual'].includes(billingPeriod)) {
      console.warn(`❌ Período inválido: ${billingPeriod}`);
      return res.status(400).json({
        success: false,
        error: 'Período de facturación inválido',
        code: 'INVALID_BILLING_PERIOD'
      });
    }

    // ============================================
    // ✅ VALIDACIÓN 4: Monto válido
    // ============================================

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El monto debe ser un número mayor a 0'
      });
    }

    // ============================================
    // ✅ VALIDACIÓN 6: CRÍTICA - Comparar precio frontend vs backend
    // ============================================

    let correctPrice = service.monthlyPrice;

    // Aplicar descuento anual si corresponde
    if (billingPeriod === 'annual') {
      const yearlyTotal = correctPrice * 12;
      const discount = yearlyTotal * 0.10; // 10% descuento
      correctPrice = Math.round(yearlyTotal - discount);
      console.log(`   📅 Precio anual con descuento: $${correctPrice} COP`);
    }

    console.log(`   Precio correcto calculado en backend: $${correctPrice} COP`);
    console.log(`   Precio recibido del frontend: $${amount}`);

    if (amount !== correctPrice) {
      console.error('🚨 ALERTA DE SEGURIDAD: Intento de fraude detectado');
      console.error(`   Service: ${serviceId}`);
      console.error(`   Precio esperado: ${correctPrice} COP`);
      console.error(`   Precio recibido: ${amount} COP`);
      console.error(`   Diferencia: ${correctPrice - amount} COP`);
      console.error(`   Email: ${email}`);
      console.error(`   IP: ${req.ip}`);

      // Log para auditoría
      logSecurityEvent({
        type: 'PRICE_MISMATCH',
        serviceId,
        expectedPrice: correctPrice,
        receivedPrice: amount,
        email,
        ip: req.ip,
        timestamp: new Date()
      });

      return res.status(400).json({
        success: false,
        error: 'El monto no coincide con el precio del servicio',
        correctAmount: correctPrice,
        code: 'PRICE_MISMATCH'
      });
    }

    /**
 * ============================================
 * ✅ VALIDACIÓN 5: CRÍTICA - Calcular precio en BACKEND
 * ============================================
 */

    // 🆕 CONVERSIÓN: Si el servicio está en USD, convertir a COP
    if (service.currency === 'USD') {
      console.log(`   💱 Convirtiendo ${correctPrice} USD a COP...`);

      try {
        const priceCOP = await convertUSDtoCOP(correctPrice);
        console.log(`   ✅ Conversión exitosa: ${correctPrice} USD = $${priceCOP} COP`);
        correctPrice = priceCOP;
      } catch (error) {
        console.error('❌ Error en conversión de moneda:', error.message);
        return res.status(500).json({
          success: false,
          error: 'No se pudo procesar la conversión de moneda',
          code: 'CURRENCY_CONVERSION_ERROR'
        });
      }
    }







    // ============================================
    // ✅ VALIDACIÓN 7: Email válido
    // ============================================

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.warn(`❌ Email inválido: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    // ============================================
    // ✅ VALIDACIÓN 8: Teléfono válido colombiano
    // ============================================

    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^3\d{9}$/.test(cleanPhone)) {
      console.warn(`❌ Teléfono inválido: ${phone}`);
      return res.status(400).json({
        success: false,
        error: 'Teléfono inválido (debe ser 10 dígitos empezando con 3)'
      });
    }

    console.log('✅ Todas las validaciones de seguridad pasadas');

    // ============================================
    // PREPARAR DATOS
    // ============================================

    const orderId = `ORD-${Date.now()}-${userId}`;
    const clientIp = getClientIp(req);
    const nameFromEmail = fullName || extractNameFromEmail(email);

    const paymentData = {
      merchantName: process.env.MERCHANT_NAME || 'Rasi',
      description: `${serviceName} - ${billingPeriod === 'monthly' ? 'Mensual' : 'Anual'}`,
      currency: "COP",
      amount: parseFloat(correctPrice), // ✅ Usar precio validado
      country,
      clientIp,
      test: process.env.EPAYCO_TEST_MODE === 'true',
      orderId,
      planId: serviceId,
      planName: serviceName,
      userId,
      email,
      billing: {
        email,
        name: nameFromEmail,
        address: '',
        typeDoc: 'CC',
        numberDoc: '',
        callingCode: '+57',
        mobilePhone: cleanPhone
      }
    };

    console.log('🔄 Creando sesión en ePayco...');

    // ============================================
    // CREAR SESIÓN EN EPAYCO
    // ============================================

    const sessionData = await createCheckoutSession(paymentData);

    if (!sessionData || !sessionData.sessionId) {
      console.error('❌ ePayco no retornó sessionId:', sessionData);
      return res.status(500).json({
        success: false,
        error: 'ePayco no retornó una sesión válida'
      });
    }

    console.log('✅ SessionId obtenido:', sessionData.sessionId);

    // ============================================
    // GUARDAR DATOS DE LA ORDEN (temporal)
    // ============================================

    global.pendingOrders = global.pendingOrders || {};
    global.pendingOrders[orderId] = {
      serviceId,
      serviceName,
      amount: correctPrice, // ✅ Guardar precio validado
      billingPeriod,
      email,
      fullName,
      phone: cleanPhone,
      flowType,
      createdAt: new Date()
    };

    // 🆕 Guardar datos de registro si están presentes
    if (registrationData && flowType === 'credentials') {
      global.pendingOrders[orderId].registrationData = registrationData;
      console.log('💾 Datos de registro guardados para orden:', orderId);
    }

    console.log('💾 Orden temporal guardada:', orderId);

    // Log de éxito
    logPaymentEvent({
      type: 'SESSION_CREATED',
      serviceId,
      orderId,
      amount: correctPrice,
      email,
      timestamp: new Date()
    });

    // ============================================
    // RETORNAR RESPUESTA
    // ============================================

    res.json({
      success: true,
      sessionId: sessionData.sessionId,
      token: sessionData.token,
      orderId
    });

  } catch (error) {
    console.error('❌ Error en createSession:', error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


/**
 * POST /api/payment/webhooks/epayco
 * Procesar confirmación de pago
 */
exports.handlePaymentConfirmation = async (req, res) => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📨 WEBHOOK RECIBIDO DE EPAYCO');
    console.log('='.repeat(70));

    // Log sanitizado (sin información sensible completa)
    console.log('📋 Parámetros principales recibidos:');
    console.log('   x_transaction_id:', req.body.x_transaction_id);
    console.log('   x_response:', req.body.x_response);
    console.log('   x_ref_payco:', req.body.x_ref_payco);
    console.log('   x_customer_email:', req.body.x_customer_email ? '***' + req.body.x_customer_email.slice(-10) : 'N/A');
    console.log('   x_customer_movil:', req.body.x_customer_movil ? '***' + req.body.x_customer_movil.slice(-4) : 'N/A');
    console.log('   x_extra1 (orderId):', req.body.x_extra1);
    console.log('   x_extra2 (serviceId):', req.body.x_extra2);
    console.log('   x_extra5 (serviceName):', req.body.x_extra5);

    const {
      x_cust_id_cliente,
      x_transaction_id,
      x_amount,
      x_currency_code,
      x_ref_payco,
      x_customer_email,
      x_response,
      x_response_reason_text,
      x_approval_code,
      x_transaction_date,
      x_extra1,
      x_extra2,
      x_extra3,
      x_extra4,
      x_extra5,
      x_customer_movil,
      x_signature,
      x_test_request
    } = req.body;

    console.log('\n✅ Parámetros extraídos correctamente');

    console.log('📋 Datos recibidos:', {
      transactionId: x_transaction_id,
      amount: x_amount,
      email: x_customer_email,
      response: x_response,
      orderId: x_extra1
    });

    // ============================================
    // 🔐 VALIDACIÓN 1: Integridad básica del webhook
    // ============================================

    if (!validateWebhookIntegrity(req.body)) {
      logInvalidWebhookAttempt(req.body, 'INVALID_WEBHOOK_INTEGRITY', {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Retornar 200 para no revelar detalles del error al atacante
      return res.status(200).json({
        success: false,
        message: 'Webhook procesado'
      });
    }

    // ============================================
    // 🔐 VALIDACIÓN 2: Firma de ePayco (CRÍTICO)
    // ============================================

    // En modo TEST de ePayco, las firmas no son confiables, así que NO validar
    // En producción o modo real, SÍ validar firma
    const shouldValidateSignature = process.env.EPAYCO_TEST_MODE !== 'true' &&
                                    (process.env.NODE_ENV === 'production' || process.env.VALIDATE_SIGNATURE === 'true');

    if (shouldValidateSignature) {
      const isValidSignature = validateEpaycoSignature(
        req.body,
        process.env.EPAYCO_PRIVATE_KEY
      );

      if (!isValidSignature) {
        logInvalidWebhookAttempt(req.body, 'INVALID_SIGNATURE', {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });

        // 🚨 ALERTA CRÍTICA DE SEGURIDAD
        console.error('🚨🚨🚨 INTENTO DE FRAUDE DETECTADO 🚨🚨🚨');
        console.error('   IP:', req.ip);
        console.error('   Transaction ID:', x_transaction_id);
        console.error('   Amount:', x_amount);

        // TODO: Enviar alerta inmediata al equipo de seguridad
        // await sendSecurityAlert({
        //   type: 'INVALID_WEBHOOK_SIGNATURE',
        //   ip: req.ip,
        //   transactionId: x_transaction_id
        // });

        // Retornar 200 para no revelar que detectamos el fraude
        return res.status(200).json({
          success: false,
          message: 'Webhook procesado'
        });
      }

      console.log('✅ Firma de webhook validada correctamente');
    } else {
      if (process.env.EPAYCO_TEST_MODE === 'true') {
        console.warn('⚠️  MODO TEST DE EPAYCO: Validación de firma DESHABILITADA');
        console.warn('   (ePayco test no genera firmas válidas)');
      } else {
        console.warn('⚠️  MODO DESARROLLO: Validación de firma DESHABILITADA');
        console.warn('   Habilitar con VALIDATE_SIGNATURE=true o NODE_ENV=production');
      }
    }

    // ============================================
    // PROCESAR SEGÚN ESTADO
    // ============================================

    if (x_response?.toLowerCase() === 'aceptada') {
      console.log('\n✅ ✅ ✅ PAGO APROBADO ✅ ✅ ✅');
      console.log('   Transacción ID:', x_transaction_id);
      console.log('   Email:', x_customer_email ? '***' + x_customer_email.slice(-10) : 'N/A');
      console.log('   Buscando orden temporal con ID:', x_extra1);

      const orderData = global.pendingOrders?.[x_extra1];

      if (!orderData) {
        console.error('❌ ERROR: No se encontraron datos de la orden:', x_extra1);
        console.error('❌ Órdenes disponibles:', Object.keys(global.pendingOrders || {}));

        // 🆕 ENCOLAR WEBHOOK PARA REINTENTO
        console.log('📥 Encolando webhook para reintento (puede que createSession esté en proceso)');
        enqueueWebhook(req.body, 'ORDER_NOT_FOUND_YET');

        return res.status(200).json({
          success: true,
          message: 'Webhook encolado para procesamiento'
        });
      }

      const { serviceId, serviceName, billingPeriod, email, fullName, phone, flowType } = orderData;

      console.log('\n📦 Datos de la orden encontrados:');
      console.log('   serviceId:', serviceId);
      console.log('   serviceName:', serviceName);
      console.log('   flowType:', flowType);
      console.log('   billingPeriod:', billingPeriod);
      console.log('   email:', email ? '***' + email.slice(-10) : 'N/A');
      console.log('   phone:', phone ? '***' + phone.slice(-4) : 'N/A');

      const salesDate = new Date();

      try {
        // ============================================
        // PROCESAR SEGÚN TIPO DE SERVICIO
        // ============================================

        if (flowType === 'credentials') {
          console.log('\n🔑 🔑 🔑 PROCESANDO RASI ASSISTANT 🔑 🔑 🔑');
          console.log('   Email:', email);
          console.log('   Phone:', phone);
          console.log('   Billing Period:', billingPeriod);

          let credentials = null;
          let credentialsAssigned = false;
          let emailSent = false;

          // 🆕 NUEVO FLUJO: Registro en API del SaaS
          const hasRegistrationData = orderData && orderData.registrationData;

          if (hasRegistrationData) {
            console.log('   🆕 NUEVO FLUJO: Registrando usuario en SaaS...');

            try {
              const registrationResult = await registerUserInSaaS(orderData.registrationData);
              console.log('   ✅ Registro exitoso en SaaS');

              // Usar credenciales: email y URL de la API, pero password original del formulario
              // (La API retorna la password encriptada, pero necesitamos enviar la original por email)
              credentials = {
                username: registrationResult.credentials.email,
                password: orderData.registrationData.passwordUsuario, // 🔑 Password original del formulario
                url: registrationResult.credentials.url,
                validUntil: null, // La API del SaaS maneja su propia expiración
                token: registrationResult.token
              };

              credentialsAssigned = true;

              // Opcional: Registrar en Google Sheets para tracking
              try {
                await assignAssistantCredentials({
                  email,
                  phone,
                  billingPeriod,
                  salesDate,
                  username: credentials.username,
                  url: credentials.url
                });
                console.log('   ✅ Registro adicional en Google Sheets completado');
              } catch (sheetError) {
                console.warn('   ⚠️  No se pudo registrar en Google Sheets (no crítico):', sheetError.message);
              }

            } catch (saasError) {
              console.error('   ❌ ERROR registrando en SaaS:', saasError.message);

              // 🚨 TRANSACCIÓN PARCIAL: Usuario pagó pero falló el registro en SaaS
              registerPartialTransaction({
                transactionId: x_transaction_id,
                orderId: x_extra1,
                email,
                serviceId,
                amount: x_amount,
                completedSteps: ['payment'],
                failedStep: 'saas_registration',
                error: saasError.message,
                needsRefund: false // Se puede reintentar el registro
              });

              throw saasError;
            }

          } else {
            // FLUJO ANTERIOR: Buscar credenciales en Google Sheets
            console.log('   → Flujo anterior: Buscando credenciales en Google Sheets...');

            try {
              credentials = await assignAssistantCredentials({
                email,
                phone,
                billingPeriod,
                salesDate
              });
              credentialsAssigned = true;
              console.log('   ✅ Credenciales obtenidas de Google Sheets');

            } catch (sheetError) {
              console.error('   ❌ ERROR asignando credenciales en Google Sheets:', sheetError.message);

              // 🔄 REGISTRAR FALLO EN SHEETS PARA COMPENSACIÓN
              registerFailedSheetWrite({
                sheetName: 'Rasi Assistant',
                operation: 'assign_credentials',
                rowData: { email, phone, billingPeriod, salesDate },
                email,
                serviceId,
                error: sheetError.message
              });

              // 🚨 TRANSACCIÓN PARCIAL: Usuario pagó pero no hay credenciales
              registerPartialTransaction({
                transactionId: x_transaction_id,
                orderId: x_extra1,
                email,
                serviceId,
                amount: x_amount,
                completedSteps: ['payment'],
                failedStep: 'assign_credentials',
                error: sheetError.message,
                needsRefund: false // Se puede resolver asignando credenciales manualmente
              });

              throw sheetError;
            }
          }

          // Intentar enviar email con credenciales
          try {
            console.log('   → Enviando email con credenciales...');
            await sendAssistantCredentials({
              email,
              fullName,
              username: credentials.username,
              password: credentials.password,
              url: credentials.url,
              validUntil: credentials.validUntil,
              billingPeriod
            });
            emailSent = true;

            console.log('   ✅ Email enviado exitosamente');

          } catch (emailError) {
            console.error('   ❌ ERROR enviando email:', emailError.message);

            // 🔄 REGISTRAR EMAIL FALLIDO PARA REINTENTO
            registerFailedEmail({
              type: 'credentials',
              email,
              fullName,
              credentials: {
                username: credentials.username,
                url: credentials.url,
                validUntil: credentials.validUntil
              },
              serviceId,
              billingPeriod,
              error: emailError.message
            });

            // 🚨 TRANSACCIÓN PARCIAL: Usuario pagó, tiene credenciales, pero no recibió email
            registerPartialTransaction({
              transactionId: x_transaction_id,
              orderId: x_extra1,
              email,
              serviceId,
              amount: x_amount,
              completedSteps: ['payment', 'assign_credentials'],
              failedStep: 'send_email',
              error: emailError.message,
              needsRefund: false // Usuario tiene las credenciales, solo falta email
            });

            // NO lanzar error - las credenciales ya están asignadas
            console.warn('   ⚠️  Credenciales asignadas pero email falló. Registrado para reintento.');
          }

        } else if (flowType === 'contact') {
          // ========================================
          // RASI AUTOCITAS: Registrar compra
          // ========================================

          console.log('📝 Procesando Rasi Autocitas...');

          let purchaseRegistered = false;

          // Registrar compra en Google Sheets
          try {
            await registerAutocitasPurchase({
              email,
              phone,
              billingPeriod,
              salesDate
            });
            purchaseRegistered = true;

            console.log('✅ Compra registrada en Google Sheets');

          } catch (sheetError) {
            console.error('   ❌ ERROR registrando compra en Google Sheets:', sheetError.message);

            // 🔄 REGISTRAR FALLO EN SHEETS PARA COMPENSACIÓN
            registerFailedSheetWrite({
              sheetName: 'Rasi Autocitas',
              operation: 'register_purchase',
              rowData: { email, phone, billingPeriod, salesDate },
              email,
              serviceId,
              error: sheetError.message
            });

            // 🚨 TRANSACCIÓN PARCIAL: Usuario pagó pero no se registró
            registerPartialTransaction({
              transactionId: x_transaction_id,
              orderId: x_extra1,
              email,
              serviceId,
              amount: x_amount,
              completedSteps: ['payment'],
              failedStep: 'register_purchase',
              error: sheetError.message,
              needsRefund: false // Se puede resolver registrando manualmente
            });

            throw sheetError;
          }

          // Enviar email de confirmación
          try {
            const validUntil = new Date(salesDate);
            if (billingPeriod === 'annual') {
              validUntil.setFullYear(validUntil.getFullYear() + 1);
            } else {
              validUntil.setMonth(validUntil.getMonth() + 1);
            }

            await sendAutocitasConfirmation({
              email,
              fullName,
              billingPeriod,
              validUntil
            });

            console.log('✅ Email de confirmación enviado');

          } catch (emailError) {
            console.error('   ❌ ERROR enviando email de confirmación:', emailError.message);

            // 🔄 REGISTRAR EMAIL FALLIDO PARA REINTENTO
            registerFailedEmail({
              type: 'confirmation',
              email,
              fullName,
              serviceId: 'rasi-autocitas',
              billingPeriod,
              error: emailError.message
            });

            // 🚨 TRANSACCIÓN PARCIAL: Registrado pero sin email
            registerPartialTransaction({
              transactionId: x_transaction_id,
              orderId: x_extra1,
              email,
              serviceId,
              amount: x_amount,
              completedSteps: ['payment', 'register_purchase'],
              failedStep: 'send_confirmation_email',
              error: emailError.message,
              needsRefund: false // Usuario está registrado, solo falta email
            });

            console.warn('   ⚠️  Compra registrada pero email falló. Registrado para reintento.');
          }
        } else if (flowType === 'chatbot') {
          // ========================================
          // RASI CHATBOT: Registrar compra
          // ========================================
          console.log('🤖 Procesando Rasi Chatbot...');

          let chatbotRegistered = false;

          // Registrar compra en Google Sheets
          try {
            await registerChatbotPurchase({
              email,
              phone,
              billingPeriod,
              salesDate
            });
            chatbotRegistered = true;

            console.log('✅ Compra de Chatbot registrada en Google Sheets');

          } catch (sheetError) {
            console.error('   ❌ ERROR registrando compra de Chatbot en Google Sheets:', sheetError.message);

            // 🔄 REGISTRAR FALLO EN SHEETS PARA COMPENSACIÓN
            registerFailedSheetWrite({
              sheetName: 'Rasi Chatbot',
              operation: 'register_purchase',
              rowData: { email, phone, billingPeriod, salesDate },
              email,
              serviceId,
              error: sheetError.message
            });

            // 🚨 TRANSACCIÓN PARCIAL: Usuario pagó pero no se registró
            registerPartialTransaction({
              transactionId: x_transaction_id,
              orderId: x_extra1,
              email,
              serviceId,
              amount: x_amount,
              completedSteps: ['payment'],
              failedStep: 'register_chatbot_purchase',
              error: sheetError.message,
              needsRefund: false // Se puede resolver registrando manualmente
            });

            throw sheetError;
          }

          // Enviar email de confirmación
          try {
            const validUntil = new Date(salesDate);
            if (billingPeriod === 'annual') {
              validUntil.setFullYear(validUntil.getFullYear() + 1);
            } else {
              validUntil.setMonth(validUntil.getMonth() + 1);
            }

            await sendChatbotConfirmation({
              email,
              fullName,
              billingPeriod,
              validUntil
            });

            console.log('✅ Email de confirmación de Chatbot enviado');

          } catch (emailError) {
            console.error('   ❌ ERROR enviando email de confirmación de Chatbot:', emailError.message);

            // 🔄 REGISTRAR EMAIL FALLIDO PARA REINTENTO
            registerFailedEmail({
              type: 'confirmation',
              email,
              fullName,
              serviceId: 'rasi-chatbot',
              billingPeriod,
              error: emailError.message
            });

            // 🚨 TRANSACCIÓN PARCIAL: Registrado pero sin email
            registerPartialTransaction({
              transactionId: x_transaction_id,
              orderId: x_extra1,
              email,
              serviceId,
              amount: x_amount,
              completedSteps: ['payment', 'register_chatbot_purchase'],
              failedStep: 'send_chatbot_confirmation_email',
              error: emailError.message,
              needsRefund: false // Usuario está registrado, solo falta email
            });

            console.warn('   ⚠️  Compra de Chatbot registrada pero email falló. Registrado para reintento.');
          }
        }


        // Limpiar orden temporal
        delete global.pendingOrders[x_extra1];

        console.log('✅ Pago procesado completamente');

      } catch (processingError) {
        console.error('❌ Error procesando orden:', processingError);
        // No fallar el webhook, pero loguear el error
      }

      // ⭐ GUARDAR ESTADO DE PAGO EXITOSO
      global.paymentStatus = global.paymentStatus || {};
      global.paymentStatus[x_transaction_id] = {
        status: 'accepted',
        transactionId: x_transaction_id,
        email: x_customer_email,
        flowType: flowType,
        timestamp: new Date()
      };
      // ⭐ MAPEAR ref_payco → x_transaction_id
      global.refPaycoMap = global.refPaycoMap || {};
      global.refPaycoMap[x_ref_payco] = x_transaction_id;

    } else if (x_response?.toLowerCase() === 'pendiente') {
      console.log('\n⏳ PAGO PENDIENTE');
      console.log('   Transacción ID:', x_transaction_id);
      console.log('   Razón: La transacción está siendo procesada');

      // ⭐ GUARDAR ESTADO DE PAGO PENDIENTE
      global.paymentStatus = global.paymentStatus || {};
      global.paymentStatus[x_transaction_id] = {
        status: 'pending',
        transactionId: x_transaction_id,
        email: x_customer_email,
        message: 'Transacción en proceso, puede tardar hasta 20 minutos',
        timestamp: new Date()
      };

      // ⭐ MAPEAR ref_payco → x_transaction_id
      global.refPaycoMap = global.refPaycoMap || {};
      global.refPaycoMap[x_ref_payco] = x_transaction_id;

      // Limpiar orden temporal (será procesada cuando llegue confirmación)
      if (x_extra1) {
        console.log('   ℹ️  Orden temporal preservada para procesamiento futuro');
      }

    } else if (x_response?.toLowerCase() === 'rechazada') {
      console.log('\n❌ PAGO RECHAZADO');
      console.log(`   Razón: ${x_response_reason_text}`);

      // ⭐ GUARDAR ESTADO DE PAGO RECHAZADO
      global.paymentStatus = global.paymentStatus || {};
      global.paymentStatus[x_transaction_id] = {
        status: 'rejected',
        transactionId: x_transaction_id,
        reason: x_response_reason_text,
        email: x_customer_email,
        timestamp: new Date()
      };

      // ⭐ MAPEAR ref_payco → x_transaction_id
      global.refPaycoMap = global.refPaycoMap || {};
      global.refPaycoMap[x_ref_payco] = x_transaction_id;
      console.log(`   ✅ Mapeado ref_payco a x_transaction_id`);
      console.log(`   Map completo:`, global.refPaycoMap);

      if (x_extra1) {
        delete global.pendingOrders[x_extra1];
      }

    } else if (x_response?.toLowerCase() === 'fallida') {
      console.log('\n❌ TRANSACCIÓN FALLIDA');
      console.log(`   Razón: ${x_response_reason_text}`);

      // ⭐ GUARDAR ESTADO FALLIDO (igual a rechazado para el usuario)
      global.paymentStatus = global.paymentStatus || {};
      global.paymentStatus[x_transaction_id] = {
        status: 'rejected',
        transactionId: x_transaction_id,
        reason: x_response_reason_text || 'Error en la transacción',
        email: x_customer_email,
        timestamp: new Date()
      };

      if (x_extra1) {
        delete global.pendingOrders[x_extra1];
      }

      // ⭐ MAPEAR ref_payco → x_transaction_id
      global.refPaycoMap = global.refPaycoMap || {};
      global.refPaycoMap[x_ref_payco] = x_transaction_id;

    } else {
      console.log('\nℹ️  Estado desconocido:', x_response);

      // ⭐ GUARDAR ESTADO DESCONOCIDO
      global.paymentStatus = global.paymentStatus || {};
      global.paymentStatus[x_transaction_id] = {
        status: 'unknown',
        transactionId: x_transaction_id,
        response: x_response,
        email: x_customer_email,
        timestamp: new Date()
      };

      // ⭐ MAPEAR ref_payco → x_transaction_id
      global.refPaycoMap = global.refPaycoMap || {};
      global.refPaycoMap[x_ref_payco] = x_transaction_id;
    }

    // ============================================
    // RESPONDER 200 OK SIEMPRE
    // ============================================

    res.status(200).json({
      success: true,
      message: 'Webhook procesado',
      transactionId: x_transaction_id
    });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);

    // Responder 200 OK igual para no generar reintentos
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/payment/verify/:refOrTransactionId
 * Verificar estado de un pago
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { refOrTransactionId } = req.params;

    console.log('🔍 Verificando pago:', refOrTransactionId);

    // AQUÍ: Consultar en Google Sheets o base de datos
    // Por ahora retornar mock

    res.json({
      success: true,
      status: 'completed',
      transactionId: refOrTransactionId,
      email: 'test@example.com',
      planName: 'Rasi Assistant',
      planId: 'rasi-assistant',
      userId: 'user-123'
    });

  } catch (error) {
    console.error('❌ Error verificando pago:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /payment-response
 * Página que ve el usuario después del pago
 */
exports.paymentResponse = async (req, res) => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📄 PAYMENT RESPONSE PAGE - Usuario redirigido desde ePayco');
    console.log('='.repeat(70));

    const params = req.method === 'POST' ? req.body : req.query;
    console.log('   Parámetros recibidos:', params);

    let { ref_payco } = params;

    if (!ref_payco) {
      console.log('   ⚠️  No se recibió ref_payco');
      return res.send(fallbackHTML());
    }

    console.log('   🔍 Consultando transacción en ePayco con ref_payco:', ref_payco);

    // ⭐ CONSULTAR ePayco para obtener datos reales de la transacción
    const axios = require('axios');

    try {
      const response = await axios.get(
        `https://secure.epayco.co/validation/v1/reference/${ref_payco}`
      );

      const transactionData = response.data;
      console.log('   📋 Datos de transacción obtenidos:', transactionData);

      // ⭐ Los datos están dentro de .data, no en el nivel raíz
      const data = transactionData.data;
      const x_transaction_id = data.x_transaction_id;
      const x_response = data.x_response;
      const x_response_reason_text = data.x_response_reason_text;

      console.log('   x_transaction_id:', x_transaction_id);
      console.log('   x_response:', x_response);

      // ⭐ Ahora consulta el estado guardado en memoria
      let paymentStatus = global.paymentStatus?.[x_transaction_id];

      if (!paymentStatus) {
        console.log('   ⚠️  Estado no encontrado en memoria, usando datos de ePayco');
        console.log('   x_response recibido de ePayco:', x_response);

        // Determinar status basado en x_response
        let statusFromEPayco = 'rejected'; // default
        if (x_response?.toLowerCase() === 'aceptada') {
          statusFromEPayco = 'accepted';
        } else if (x_response?.toLowerCase() === 'pendiente') {
          statusFromEPayco = 'pending';
        } else if (x_response?.toLowerCase() === 'rechazada') {
          statusFromEPayco = 'rejected';
        } else if (x_response?.toLowerCase() === 'fallida') {
          statusFromEPayco = 'rejected';
        }

        console.log('   Status determinado:', statusFromEPayco);

        paymentStatus = {
          status: statusFromEPayco,
          transactionId: x_transaction_id,
          reason: x_response_reason_text
        };
      }

      const status = paymentStatus.status;
      console.log('   📍 Status final:', status);

      // ✅ PAGO EXITOSO
      if (status === 'accepted') {
        // Determinar mensaje según el servicio
        let successMessage = '';
        let successSubtext = '';

        const flowType = paymentStatus.flowType;
        console.log('   flowType:', flowType);

        if (flowType === 'contact') {
          // Rasi Autocitas
          successMessage = '✅ ¡Pago Exitoso!';
          successSubtext = `
            <p>Tu transacción ha sido procesada correctamente.</p>
            <p>En breve nos pondremos en contacto para preparar la configuración del servicio.</p>
            <p>Gracias por confiar en Rasi.</p>
          `;
        } else if (flowType === 'credentials') {
          // Rasi Assistant
          successMessage = '✅ ¡Pago Exitoso!';
          successSubtext = `
            <p>Tu transacción ha sido procesada correctamente.</p>
            <p>En breve recibirás un email con tus credenciales e instrucciones.</p>
            <p>Gracias por confiar en Rasi.</p>
          `;
        } else {
          // Default
          successMessage = '✅ ¡Pago Exitoso!';
          successSubtext = `
            <p>Tu transacción ha sido procesada correctamente.</p>
            <p>Gracias por confiar en Rasi.</p>
          `;
        }

        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${successMessage}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              .container {
                background: white;
                color: #333;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 500px;
              }
              .success { 
                color: #10b981; 
                font-size: 28px; 
                font-weight: bold;
                margin-bottom: 20px;
              }
              .message {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
                color: #555;
              }
              .link {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
              }
              .link:hover {
                background: #764ba2;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success">${successMessage}</div>
              <div class="message">
                ${successSubtext}
              </div>
              <a href="${frontend}" class="link">Volver al Inicio</a>

              <script>
                setTimeout(() => {
                  window.location.href = '${frontend}';
                }, 4000);
              </script>
            </div>
          </body>
          </html>
        `);
      }

      // ❌ PAGO RECHAZADO
      if (status === 'rejected') {
        const reason = paymentStatus.reason || 'Tu pago no pudo ser autorizado';

        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>❌ Pago Rechazado</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              .container {
                background: white;
                color: #333;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 500px;
              }
              .error { 
                color: #ef4444; 
                font-size: 28px; 
                font-weight: bold;
                margin-bottom: 20px;
              }
              .message {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
                color: #555;
              }
              .reason {
                background: #fee2e2;
                color: #991b1b;
                padding: 12px;
                border-radius: 5px;
                margin: 15px 0;
                font-size: 14px;
              }
              .link {
                display: inline-block;
                background: #ef4444;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
              }
              .link:hover {
                background: #dc2626;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error">❌ Pago Rechazado</div>
              <div class="message">
                <p>Tu pago no pudo ser procesado.</p>
              </div>
              <div class="reason">Razón: ${reason}</div>
              <p>Por favor intenta nuevamente con otro método de pago.</p>
              <a href="${frontend}" class="link">Volver e intentar de nuevo</a>
            </div>
          </body>
          </html>
        `);
      }

      return res.send(fallbackHTML());

    } catch (error) {
      console.error('❌ Error consultando ePayco:', error.message);
      return res.send(fallbackHTML());
    }

  } catch (error) {
    console.error('❌ Error en payment-response:', error);
    res.status(500).send('Error procesando respuesta de pago');
  }
};

function fallbackHTML() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Procesando Transacción</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .container {
          background: white;
          color: #333;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          max-width: 500px;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Procesando tu transacción...</h2>
        <div class="spinner"></div>
        <div class="message">
          <p>Por favor espera mientras confirmamos tu pago.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * FUNCIONES DE LOGGING
 * Para auditoría y seguridad
 */
function logSecurityEvent(event) {
  // TODO: Guardar en base de datos o archivo de logs
  console.log(`📋 [SECURITY] ${event.type}:`, event);
}

function logPaymentEvent(event) {
  // TODO: Guardar en base de datos o archivo de logs
  console.log(`📋 [PAYMENT] ${event.type}:`, event);
}

/**
 * ============================================
 * ENDPOINTS DE MONITOREO Y COMPENSACIÓN
 * ============================================
 */

/**
 * GET /api/payment/admin/compensation/stats
 * Obtener estadísticas de compensaciones pendientes
 *
 * 🔐 NOTA: En producción, proteger con autenticación de admin
 */
exports.getCompensationStats = (req, res) => {
  try {
    const stats = getCompensationStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    console.error('Error obteniendo stats de compensación:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
};

/**
 * GET /api/payment/admin/compensation/report
 * Generar reporte completo de compensaciones
 *
 * 🔐 NOTA: En producción, proteger con autenticación de admin
 */
exports.getCompensationReport = (req, res) => {
  try {
    const report = generateCompensationReport();

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error generando reporte de compensación:', error);
    res.status(500).json({
      success: false,
      error: 'Error generando reporte'
    });
  }
};

/**
 * POST /api/payment/admin/compensation/resolve
 * Marcar una compensación como resuelta manualmente
 *
 * Body: {
 *   type: 'email' | 'sheet' | 'transaction',
 *   id: 'EMAIL-xxxxx' | 'SHEET-xxxxx' | 'PARTIAL-xxxxx'
 * }
 *
 * 🔐 NOTA: En producción, proteger con autenticación de admin
 */
exports.resolveCompensation = (req, res) => {
  try {
    const { type, id } = req.body;

    if (!type || !id) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren type e id'
      });
    }

    const result = markAsResolved(type, id);

    if (result.success) {
      res.json({
        success: true,
        message: 'Compensación marcada como resuelta',
        item: result.item
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error resolviendo compensación:', error);
    res.status(500).json({
      success: false,
      error: 'Error resolviendo compensación'
    });
  }
};

module.exports = exports;