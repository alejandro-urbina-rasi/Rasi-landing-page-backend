const axios = require('axios');
require('dotenv').config();

const SAAS_API_URL = process.env.SAAS_API_URL || 'http://localhost:5000';

console.log('🧪 PRUEBA DE CONEXIÓN CON API DEL SAAS');
console.log('=====================================\n');

async function testSaaSConnection() {
  console.log('1️⃣ Verificando URL configurada...');
  console.log('   SAAS_API_URL:', SAAS_API_URL);
  console.log('');

  // Test 1: Health check
  console.log('2️⃣ Probando endpoint /health...');
  try {
    const healthResponse = await axios.get(`${SAAS_API_URL}/health`, {
      timeout: 5000
    });
    console.log('   ✅ Health check exitoso');
    console.log('   Status:', healthResponse.status);
    console.log('   Data:', healthResponse.data);
  } catch (error) {
    console.log('   ❌ Health check falló');
    if (error.code === 'ECONNREFUSED') {
      console.log('   Error: No hay servidor corriendo en', SAAS_API_URL);
      console.log('   👉 Asegúrate de que el servidor SaaS esté corriendo');
      return;
    }
    console.log('   Error:', error.message);
  }
  console.log('');

  // Test 2: Endpoint de registro
  console.log('3️⃣ Probando endpoint /api/auth/registro-publico...');

  const testData = {
    nombre: 'Empresa de Prueba',
    nit: '900123456',
    representante_legal: 'Juan Pérez',
    email_usuario: 'test@example.com',
    nombre_usuario: 'Juan Pérez',
    documento: '1234567890',
    password_usuario: 'TestPassword123!'
  };

  console.log('   📤 Enviando datos de prueba:', {
    nombre: testData.nombre,
    email_usuario: testData.email_usuario
  });

  try {
    const response = await axios.post(
      `${SAAS_API_URL}/api/auth/registro-publico`,
      testData,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✅ Registro de prueba exitoso');
    console.log('   Status:', response.status);
    console.log('   Response estructura:', {
      message: response.data.message,
      hasToken: !!response.data.token,
      hasUsuario: !!response.data.usuario,
      hasEmpresa: !!response.data.empresa,
      hasCredenciales: !!response.data.credenciales
    });

    if (response.data.credenciales) {
      console.log('   Credenciales recibidas:', {
        email_usuario: response.data.credenciales.email_usuario,
        password_usuario: '***' // No mostrar password real
      });
    }

  } catch (error) {
    console.log('   ❌ Registro de prueba falló');

    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error data:', error.response.data);

      if (error.response.status === 400) {
        console.log('   👉 El servidor rechazó los datos (validación falló)');
      } else if (error.response.status === 409) {
        console.log('   👉 El usuario ya existe (esto es normal en una prueba)');
      }
    } else if (error.request) {
      console.log('   👉 No se recibió respuesta del servidor');
      console.log('   Error:', error.message);
    } else {
      console.log('   Error:', error.message);
    }
  }

  console.log('\n=====================================');
  console.log('✅ Prueba completada');
}

testSaaSConnection().catch(console.error);
