// ============================================================================
// MINEGUARD – Edge Function: Sensor Data Ingestion
// Accepts POST requests from ESP32 helmets and writes to Supabase tables.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ---- Authenticate via X-API-Key header --------------------------------
    const apiKey = req.headers.get('X-API-Key') ?? req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('DEVICE_API_KEY');

    if (!expectedKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- Parse body -------------------------------------------------------
    const body = await req.json();

    const helmetCode: string | undefined = body.helmet_id;
    if (!helmetCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: helmet_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Require at least one sensor field
    const sensorFields = [
      'temperature',
      'humidity',
      'mq3_raw',
      'mq7_raw',
      'accel_x',
      'accel_y',
      'accel_z',
      'gyro_x',
      'gyro_y',
      'gyro_z',
    ];
    const hasSensorData = sensorFields.some(
      (f) => body[f] !== undefined && body[f] !== null,
    );
    if (!hasSensorData) {
      return new Response(
        JSON.stringify({
          error: 'At least one sensor field must be provided',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ---- Supabase client (service role) -----------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ---- Look up helmet by helmet_code ------------------------------------
    const { data: helmet, error: helmetError } = await supabase
      .from('helmets')
      .select('id, worker_id')
      .eq('helmet_code', helmetCode)
      .single();

    if (helmetError || !helmet) {
      return new Response(
        JSON.stringify({
          error: `Helmet not found for code: ${helmetCode}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const helmetId: string = helmet.id;
    const workerId: string | null = helmet.worker_id;

    // ---- Insert sensor reading --------------------------------------------
    const sensorPayload: Record<string, unknown> = {
      helmet_id: helmetId,
      temperature: body.temperature ?? null,
      humidity: body.humidity ?? null,
      mq3_raw: body.mq3_raw ?? null,
      mq7_raw: body.mq7_raw ?? null,
      mq7_ppm: body.mq7_ppm ?? null,
      accel_x: body.accel_x ?? null,
      accel_y: body.accel_y ?? null,
      accel_z: body.accel_z ?? null,
      gyro_x: body.gyro_x ?? null,
      gyro_y: body.gyro_y ?? null,
      gyro_z: body.gyro_z ?? null,
      movement_status: body.movement_status ?? null,
    };

    const { error: insertError } = await supabase
      .from('sensor_readings')
      .insert(sensorPayload);

    if (insertError) {
      console.error('sensor_readings insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert sensor reading' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ---- Insert worker location if GPS data is valid ----------------------
    if (
      body.latitude !== undefined &&
      body.longitude !== undefined &&
      body.gps_valid === true &&
      workerId
    ) {
      const { error: locError } = await supabase
        .from('worker_locations')
        .insert({
          worker_id: workerId,
          helmet_id: helmetId,
          latitude: body.latitude,
          longitude: body.longitude,
          gps_valid: true,
        });

      if (locError) {
        console.error('worker_locations insert error:', locError);
        // Non-fatal: continue processing
      }
    }

    // ---- Create EMERGENCY_SOS alert if button pressed ---------------------
    if (body.emergency_pressed === true) {
      const alertPayload: Record<string, unknown> = {
        worker_id: workerId,
        helmet_id: helmetId,
        alert_type: 'EMERGENCY_SOS',
        severity: 'CRITICAL',
        description: `Emergency SOS triggered by helmet ${helmetCode}`,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        acknowledged: false,
        resolved: false,
      };

      const { error: alertError } = await supabase
        .from('alerts')
        .insert(alertPayload);

      if (alertError) {
        console.error('alerts insert error:', alertError);
        // Non-fatal: continue
      }
    }

    // ---- Success ----------------------------------------------------------
    return new Response(
      JSON.stringify({ success: true, helmet_id: helmetId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
