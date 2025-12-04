const { google } = require('googleapis');
const path = require('path');

// Inicializar Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, '../../google-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_CREDENTIALS = 'Credenciales';  // Hoja para Rasi Assistant
const SHEET_AUTOCITAS = 'Autocitas';       // Hoja para Rasi Autocitas
const SHEET_CHATBOT = 'Chatbot';           // Hoja para Rasi Chatbot

/**
 * Buscar primera fila disponible de Rasi Assistant
 * Estructura: [ID, Username, Password, URL, TipoPlan, Servicio, Estado, Email, Fecha, Telefono, ValidoHasta]
 */
async function findAvailableAssistantCredentials() {
  try {
    console.log('🔍 Buscando credenciales disponibles de Rasi Assistant en hoja "Credenciales"...');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_CREDENTIALS}!A2:K`,  // EMPIEZA EN A2, NO EN A1
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    const rows = response.data.values || [];
    console.log(`📊 Total de filas encontradas: ${rows.length}`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Destructurar correctamente
      const id = row[0] || '';               // A
      const username = row[1] || '';         // B
      const password = row[2] || '';         // C
      const url = row[3] || '';              // D
      const tipoPlan = row[4] || '';         // E
      const servicio = row[5] || '';         // F
      const estado = row[6] || '';           // G

      if (
        typeof servicio === 'string' && servicio.toLowerCase().includes('rasi assistant') &&
        typeof estado === 'string' && estado.toLowerCase() === 'disponible' &&
        username &&
        password
      ) {
        console.log(`✅ Credenciales disponibles encontradas`);
        
        return {
          rowIndex: i + 2,
          id,
          username,
          password,
          url,
          sheetName: SHEET_CREDENTIALS
        };
      }
    }

    console.error('❌ No hay credenciales disponibles de Rasi Assistant');
    return null;

  } catch (error) {
    console.error('❌ Error buscando credenciales:', error.message);
    throw error;
  }
}


/**
 * Asignar credenciales de Rasi Assistant a un cliente
 */
async function assignAssistantCredentials(data) {
  try {
    const { email, phone, billingPeriod, salesDate, username, url } = data;

    console.log('📝 Asignando credenciales de Rasi Assistant...');

    let credentials;
    let isFromSaaS = false;

    // 🆕 Si se proporcionan username y url, son del SaaS API (solo registro)
    if (username && url) {
      console.log('   ℹ️  Credenciales provistas desde SaaS API (solo registro)');
      isFromSaaS = true;

      credentials = {
        id: `SAAS-${Date.now()}`, // ID generado para tracking
        username,
        password: '(gestionada por SaaS)', // No almacenar password del SaaS
        url: process.env.SAAS_FRONTEND_URL || url,
        rowIndex: null // No hay fila específica para actualizar
      };

    } else {
      // FLUJO ANTERIOR: Buscar credenciales disponibles en Google Sheets
      console.log('   → Buscando credenciales disponibles en Google Sheets...');

      credentials = await findAvailableAssistantCredentials();

      if (!credentials) {
        throw new Error('No hay credenciales disponibles de Rasi Assistant');
      }
    }

    const validUntil = calculateValidUntil(salesDate, billingPeriod);

    // Construir la fila con datos actualizados
    const values = [
      [
        credentials.id,                                    // A - ID
        credentials.username,                              // B - Username
        credentials.password,                              // C - Password
        process.env.SAAS_FRONTEND_URL,                     // D - URL_Redirección
        billingPeriod === 'monthly' ? 'Mensual' : 'Anual', // E - Tipo de Plan
        'Rasi Assistant',                                  // F - Servicio
        'Asignado',                                        // G - Estado
        email,                                             // H - Email_Vendido
        formatDate(salesDate),                             // I - Fecha_Venta
        phone,                                             // J - Telefono
        formatDate(validUntil)                             // K - Válido Hasta
      ]
    ];

    if (isFromSaaS) {
      // Solo agregar nueva fila al final (append) para tracking
      console.log('   📤 Agregando registro de SaaS a Google Sheets...');

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_CREDENTIALS}!A:K`,
        valueInputOption: 'RAW',
        resource: { values }
      });

      console.log('   ✅ Registro de SaaS agregado a Google Sheets');

    } else {
      // Actualizar fila existente (flujo anterior)
      console.log(`   📤 Actualizando fila ${credentials.rowIndex}...`);

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_CREDENTIALS}!A${credentials.rowIndex}:K${credentials.rowIndex}`,
        valueInputOption: 'RAW',
        resource: { values }
      });

      console.log(`   ✅ Credenciales asignadas en fila ${credentials.rowIndex}`);
    }

    return {
      username: credentials.username,
      password: credentials.password,
      url: credentials.url,
      validUntil
    };

  } catch (error) {
    console.error('❌ Error asignando credenciales:', error);
    throw error;
  }
}

/**
 * Registrar compra de Rasi Autocitas
 * Estructura simplificada: ID, Tipo de Plan, Servicio, Estado, Email_Vendido, Fecha_Venta, Telefono, Válido Hasta
 */
async function registerAutocitasPurchase(data) {
  try {
    const { email, phone, billingPeriod, salesDate } = data;

    console.log('📝 Registrando compra de Rasi Autocitas en hoja "Autocitas"...');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_AUTOCITAS}!A2:H`,
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    const rows = response.data.values || [];
    console.log(`📊 Total de filas encontradas en Autocitas: ${rows.length}`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      const id = row[0] || '';
      const tipoPlan = row[1] || '';
      const servicio = row[2] || '';
      const estado = row[3] || '';
      const emailVendido = row[4] || '';
      const fechaVenta = row[5] || '';
      const telefono = row[6] || '';
      const validoHasta = row[7] || '';

      console.log(`   Fila ${i + 2}: ID="${id}", Servicio="${servicio}", Estado="${estado}"`);

      // ⭐ BÚSQUEDA CORRECTA: Debe ser disponible Y ser Rasi Autocitas (o vacío)
      const esAutocitas = typeof servicio === 'string' && servicio.toLowerCase().includes('rasi autocitas');
      const esDisponible = typeof estado === 'string' && estado.toLowerCase() === 'disponible';
      
      console.log(`      esAutocitas: ${esAutocitas}, esDisponible: ${esDisponible}`);

      if (esDisponible && (esAutocitas || !servicio)) {
        const rowIndex = i + 2;
        console.log(`✅ Fila disponible encontrada en fila ${rowIndex}`);

        const validUntil = calculateValidUntil(salesDate, billingPeriod);

        const values = [
          [
            id || '',
            billingPeriod === 'monthly' ? 'Mensual' : 'Anual',
            'Rasi Autocitas',
            'Asignado',
            email,
            formatDate(salesDate),
            phone,
            formatDate(validUntil)
          ]
        ];

        console.log(`📤 Actualizando fila ${rowIndex}...`);

        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${SHEET_AUTOCITAS}!A${rowIndex}:H${rowIndex}`,
          valueInputOption: 'RAW',
          resource: { values }
        });

        console.log(`✅ Compra registrada en fila ${rowIndex}`);
        return { success: true, rowIndex };
      }
    }

    console.error('❌ No hay filas disponibles para Rasi Autocitas');
    throw new Error('No hay espacio disponible en la hoja de Rasi Autocitas');

  } catch (error) {
    console.error('❌ Error registrando compra:', error);
    throw error;
  }
}

/**
 * Registrar compra de Rasi Chatbot
 * Estructura simplificada: ID, Tipo de Plan, Servicio, Estado, Email_Vendido, Fecha_Venta, Telefono, Válido Hasta
 * ⭐ IDÉNTICA a registerAutocitasPurchase pero busca en SHEET_CHATBOT
 */
async function registerChatbotPurchase(data) {
  try {
    const { email, phone, billingPeriod, salesDate } = data;
    console.log('📝 Registrando compra de Rasi Chatbot en hoja "Chatbot"...');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_CHATBOT}!A2:H`,
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    const rows = response.data.values || [];
    console.log(`📊 Total de filas encontradas en Chatbot: ${rows.length}`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = row[0] || '';
      const tipoPlan = row[1] || '';
      const servicio = row[2] || '';
      const estado = row[3] || '';
      const emailVendido = row[4] || '';
      const fechaVenta = row[5] || '';
      const telefono = row[6] || '';
      const validoHasta = row[7] || '';

      console.log(` Fila ${i + 2}: ID="${id}", Servicio="${servicio}", Estado="${estado}"`);

      // ⭐ BÚSQUEDA: Debe ser disponible Y ser Rasi Chatbot (o vacío)
      const esChatbot = typeof servicio === 'string' && servicio.toLowerCase().includes('rasi chatbot');
      const esDisponible = typeof estado === 'string' && estado.toLowerCase() === 'disponible';

      console.log(` esChatbot: ${esChatbot}, esDisponible: ${esDisponible}`);

      if (esDisponible && (esChatbot || !servicio)) {
        const rowIndex = i + 2;
        console.log(`✅ Fila disponible encontrada en fila ${rowIndex}`);

        const validUntil = calculateValidUntil(salesDate, billingPeriod);
        const values = [
          [
          id || '',
          billingPeriod === 'monthly' ? 'Mensual' : 'Anual',
          'Rasi Chatbot',
          'Asignado',
          email,
          formatDate(salesDate),
          phone,
          formatDate(validUntil)
          ]
        ];

        console.log(`📤 Actualizando fila ${rowIndex}...`);
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${SHEET_CHATBOT}!A${rowIndex}:H${rowIndex}`,
          valueInputOption: 'RAW',
          resource: { values }
        });

        console.log(`✅ Compra registrada en fila ${rowIndex}`);
        return { success: true, rowIndex };
      }
    }

    console.error('❌ No hay filas disponibles para Rasi Chatbot');
    throw new Error('No hay espacio disponible en la hoja de Rasi Chatbot');
  } catch (error) {
    console.error('❌ Error registrando compra de Chatbot:', error);
    throw error;
  }
}


/**
 * Calcular fecha "Válido hasta"
 */
function calculateValidUntil(startDate, billingPeriod) {
  const date = new Date(startDate);
  
  if (billingPeriod === 'annual') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  
  return date;
}

/**
 * Formatear fecha a DD/MM/YYYY
 */
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

module.exports = {
  findAvailableAssistantCredentials,
  assignAssistantCredentials,
  registerAutocitasPurchase,
  registerChatbotPurchase
};
