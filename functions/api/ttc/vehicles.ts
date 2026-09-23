type ProtoValue = number | Uint8Array;

function readVarint(bytes: Uint8Array, state: { offset: number }): number {
  let value = 0;
  let multiplier = 1;
  while (state.offset < bytes.length) {
    const byte = bytes[state.offset++];
    value += (byte & 0x7f) * multiplier;
    if (byte < 0x80) return value;
    multiplier *= 128;
    if (multiplier > Number.MAX_SAFE_INTEGER) throw new Error('Invalid protobuf varint');
  }
  throw new Error('Truncated protobuf varint');
}

function readFields(bytes: Uint8Array): Array<{ number: number; wire: number; value: ProtoValue }> {
  const fields: Array<{ number: number; wire: number; value: ProtoValue }> = [];
  const state = { offset: 0 };

  while (state.offset < bytes.length) {
    const tag = readVarint(bytes, state);
    const number = Math.floor(tag / 8);
    const wire = tag & 7;
    if (!number) throw new Error('Invalid protobuf field');

    if (wire === 0) {
      fields.push({ number, wire, value: readVarint(bytes, state) });
    } else if (wire === 1) {
      state.offset += 8;
    } else if (wire === 2) {
      const length = readVarint(bytes, state);
      const end = state.offset + length;
      if (end > bytes.length) throw new Error('Truncated protobuf field');
      fields.push({ number, wire, value: bytes.subarray(state.offset, end) });
      state.offset = end;
    } else if (wire === 5) {
      if (state.offset + 4 > bytes.length) throw new Error('Truncated protobuf field');
      fields.push({
        number,
        wire,
        value: new DataView(bytes.buffer, bytes.byteOffset + state.offset, 4).getFloat32(0, true),
      });
      state.offset += 4;
    } else {
      throw new Error('Unsupported protobuf wire type');
    }
  }
  return fields;
}

function bytesValue(fields: Array<{ number: number; wire: number; value: ProtoValue }>, number: number): Uint8Array | undefined {
  const value = fields.find(field => field.number === number && field.wire === 2)?.value;
  return value instanceof Uint8Array ? value : undefined;
}

function numberValue(fields: Array<{ number: number; wire: number; value: ProtoValue }>, number: number): number | undefined {
  const field = fields.find(item => item.number === number && (item.wire === 0 || item.wire === 5));
  return typeof field?.value === 'number' ? field.value : undefined;
}

function stringValue(fields: Array<{ number: number; wire: number; value: ProtoValue }>, number: number): string {
  const value = bytesValue(fields, number);
  return value ? new TextDecoder().decode(value) : '';
}

function decodeVehicles(bytes: Uint8Array): Array<Record<string, unknown>> {
  const feed = readFields(bytes);
  return feed
    .filter(field => field.number === 2 && field.wire === 2 && field.value instanceof Uint8Array)
    .flatMap(entityField => {
      const entity = readFields(entityField.value as Uint8Array);
      const vehicleBytes = bytesValue(entity, 4);
      if (!vehicleBytes) return [];

      const vehicle = readFields(vehicleBytes);
      const positionBytes = bytesValue(vehicle, 2);
      if (!positionBytes) return [];
      const position = readFields(positionBytes);

      const tripBytes = bytesValue(vehicle, 1);
      const trip = tripBytes ? readFields(tripBytes) : [];
      const vehicleDescriptorBytes = bytesValue(vehicle, 8);
      const descriptor = vehicleDescriptorBytes ? readFields(vehicleDescriptorBytes) : [];

      const routeId = stringValue(trip, 5);
      if (!routeId || !/(^|[^0-9])121([^0-9]|$)/.test(routeId)) return [];

      const lat = numberValue(position, 1);
      const lon = numberValue(position, 2);
      if (lat === undefined || lon === undefined) return [];

      const directionId = numberValue(trip, 6);
      const bearing = numberValue(position, 3) ?? 0;
      const speedMps = numberValue(position, 5);
      const occupancy = numberValue(vehicle, 9);
      const vid = stringValue(descriptor, 1) || stringValue(descriptor, 2) || stringValue(entity, 1);
      const timestamp = numberValue(vehicle, 5);
      const direction = directionId === 0 ? 'East' : directionId === 1 ? 'West' : (bearing > 180 ? 'West' : 'East');

      return [{
        vid,
        rt: routeId,
        lat: String(lat),
        lon: String(lon),
        hdg: String(bearing),
        // The client converts the BusTime speed field from mph to km/h.
        spd: speedMps === undefined ? '' : String(speedMps * 2.236936),
        rtdir: direction,
        des: direction === 'East' ? 'Towards Hennick Bridgepoint Hospital' : 'Towards Union Station',
        psgld: occupancy === 1 ? 'EMPTY' : occupancy === 2 ? 'HALF_EMPTY' : occupancy === 3 ? 'HALF_FULL' : occupancy && occupancy >= 4 ? 'FULL' : '',
        tmstmp: timestamp ? new Date(timestamp * 1000).toISOString() : '',
      }];
    });
}

export async function onRequestGet({ request }: { request: Request }): Promise<Response> {
  const route = new URL(request.url).searchParams.get('rt') || '121';
  if (route !== '121') {
    return Response.json({ error: 'Only TTC Route 121 is supported.' }, { status: 400 });
  }

  try {
    const upstream = await fetch('https://bustime.ttc.ca/gtfsrt/vehicles', {
      headers: { Accept: 'application/x-protobuf, application/octet-stream', 'Cache-Control': 'no-cache' },
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    });
    if (!upstream.ok) {
      return Response.json({ error: 'TTC vehicle feed unavailable.' }, {
        status: 502,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const vehicles = decodeVehicles(new Uint8Array(await upstream.arrayBuffer()));
    return Response.json({ 'bustime-response': { vehicle: vehicles } }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'TTC vehicle feed could not be decoded.' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
