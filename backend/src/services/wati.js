const https = require('https');
const http = require('http');

/**
 * Extracts tenant_id from WATI JWT token or environment
 */
function getTenantId(token) {
  if (process.env.WATI_TENANT_ID) return process.env.WATI_TENANT_ID;
  if (!token) return null;
  try {
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    const parts = cleanToken.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.tenant_id) return payload.tenant_id;
    }
  } catch (e) {
    // ignore decoding errors
  }
  return null;
}

/**
 * Sends a WhatsApp message via WATI WhatsApp Business API
 * Falls back to logged simulation if WATI credentials are not yet configured in .env
 */
async function sendWatiMessage({ phone, templateName, broadcastTitle, parameters }) {
  const endpoint = process.env.WATI_API_ENDPOINT;
  const rawToken = process.env.WATI_ACCESS_TOKEN;

  // Format phone to clean international format (e.g. 919723054593)
  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  // If live credentials are provided, call WATI API directly
  if (endpoint && rawToken && endpoint !== 'https://live-server-XXXX.wati.io') {
    const cleanToken = rawToken.replace(/^Bearer\s+/i, '').trim();
    const authToken = `Bearer ${cleanToken}`;
    const tenantId = getTenantId(cleanToken);

    // If endpoint doesn't contain tenantId and we have one, inject it into path
    let baseUrl = endpoint.replace(/\/$/, '');
    if (tenantId && !baseUrl.includes(`/${tenantId}`)) {
      baseUrl = `${baseUrl}/${tenantId}`;
    }

    const postData = JSON.stringify({
      template_name: templateName,
      broadcast_name: broadcastTitle || 'GV_Fitness_Alert',
      parameters: parameters || []
    });

    const parsedUrl = new URL(`${baseUrl}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone}`);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const req = client.request(parsedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken,
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const isSuccess = res.statusCode >= 200 && res.statusCode < 300 && (parsed.result !== false);
            resolve({
              success: isSuccess,
              statusCode: res.statusCode,
              watiMessageId: parsed.local_message_id || parsed.messageId || parsed.id || 'wati_' + Date.now(),
              phone: cleanPhone,
              raw: parsed
            });
          } catch (e) {
            resolve({
              success: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
              error: body
            });
          }
        });
      });

      req.on('error', (err) => {
        console.error('[WATI HTTP Request Error]:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.write(postData);
      req.end();
    });
  }

  // Graceful simulation mode (when live credentials are not yet placed in .env)
  console.log(`[WATI Simulation Mode] Message prepared for +${cleanPhone}`);
  console.log(`  Template: ${templateName}`);
  console.log(`  Parameters:`, JSON.stringify(parameters));

  return {
    success: true,
    isSimulation: true,
    watiMessageId: 'sim_wati_' + Math.random().toString(36).substring(2, 10),
    phone: cleanPhone,
    message: 'WATI simulation dispatch successful (Add live token in .env to send real WhatsApp message)'
  };
}

module.exports = { sendWatiMessage };
