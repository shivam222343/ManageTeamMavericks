/**
 * Realtime WebSocket & Broadcast Server for Team Mavericks
 * RFC 6455 Compliant with Zero External Dependencies
 */
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.SOCKET_PORT || 8085;
const clients = new Map(); // socket -> { id, role, userId, authenticated }

// Create HTTP Server
const server = http.createServer((req, res) => {
  // Enable CORS for broadcast endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      clients: clients.size,
      uptime: process.uptime()
    }));
    return;
  }

  // Broadcast Webhook Endpoint (Called by PHP or internal services)
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const count = broadcastMessage(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, delivered_to: count }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket Handshake (RFC 6455)
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const acceptKey = crypto
    .createHash('sha1')
    .update(key + GUID)
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(headers.join('\r\n') + '\r\n\r\n');

  // Register client
  const clientId = 'client_' + Math.random().toString(36).substr(2, 9);
  const clientInfo = {
    id: clientId,
    socket,
    role: 'all',
    userId: null,
    connectedAt: new Date()
  };
  clients.set(socket, clientInfo);

  // Send initial welcome/connected frame
  sendFrame(socket, {
    type: 'connected',
    clientId,
    timestamp: new Date().toISOString()
  });

  // Handle incoming frames
  socket.on('data', (buffer) => {
    handleIncomingData(socket, buffer);
  });

  socket.on('close', () => {
    clients.delete(socket);
  });

  socket.on('error', () => {
    clients.delete(socket);
  });
});

// Handle WebSocket Frames from Browser
function handleIncomingData(socket, buffer) {
  try {
    if (buffer.length < 2) return;

    const firstByte = buffer[0];
    const secondByte = buffer[1];
    const opcode = firstByte & 0x0f;
    const isMasked = (secondByte & 0x80) === 0x80;

    // Opcode 8 = Close frame
    if (opcode === 0x08) {
      socket.end();
      clients.delete(socket);
      return;
    }

    // Opcode 9 = Ping, reply with Pong (0x0A)
    if (opcode === 0x09) {
      const pong = Buffer.from([0x8a, 0x00]);
      socket.write(pong);
      return;
    }

    // Extract payload length
    let payloadLength = secondByte & 0x7f;
    let currentOffset = 2;

    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(2);
      currentOffset = 4;
    } else if (payloadLength === 127) {
      payloadLength = Number(buffer.readBigUInt64BE(2));
      currentOffset = 10;
    }

    if (!isMasked) return;

    const maskingKey = buffer.slice(currentOffset, currentOffset + 4);
    currentOffset += 4;

    const payloadData = buffer.slice(currentOffset, currentOffset + payloadLength);
    const unmasked = Buffer.alloc(payloadLength);

    for (let i = 0; i < payloadLength; i++) {
      unmasked[i] = payloadData[i] ^ maskingKey[i % 4];
    }

    const messageStr = unmasked.toString('utf8');
    const msg = JSON.parse(messageStr);

    const client = clients.get(socket);
    if (!client) return;

    if (msg.type === 'auth' || msg.type === 'identify') {
      if (msg.userId) client.userId = Number(msg.userId);
      if (msg.role) client.role = msg.role;
      if (msg.subEventId) client.subEventId = Number(msg.subEventId);
      sendFrame(socket, { type: 'auth_ack', status: 'ready', userId: client.userId, role: client.role });
    } else if (msg.type === 'game_join') {
      if (msg.subEventId) client.subEventId = Number(msg.subEventId);
      if (msg.gameKey) client.gameKey = msg.gameKey;
      if (msg.userId) client.userId = Number(msg.userId);
      sendFrame(socket, {
        type: 'game_joined',
        subEventId: client.subEventId,
        gameKey: client.gameKey,
        activePlayersCount: getActiveRoomCount(client.subEventId),
        timestamp: Date.now()
      });
    } else if (msg.type === 'game_action' || msg.type === 'game_move') {
      // Lightweight high-throughput move ack (<2ms latency)
      sendFrame(socket, {
        type: 'game_move_ack',
        actionId: msg.actionId || null,
        level: msg.level ?? 1,
        movesCount: msg.movesCount ?? 0,
        timestamp: Date.now()
      });
    } else if (msg.type === 'game_level_complete') {
      const awarded = Number(msg.pointsAwarded ?? 4);
      sendFrame(socket, {
        type: 'game_level_complete_ack',
        level: msg.level,
        pointsAwarded: awarded,
        nextLevel: Number(msg.level ?? 1) + 1,
        timestamp: Date.now()
      });
    } else if (msg.type === 'game_level_fail' || msg.type === 'game_level_reset') {
      const penalty = Number(msg.pointsDeducted ?? 1);
      sendFrame(socket, {
        type: 'game_level_fail_ack',
        level: msg.level,
        pointsDeducted: penalty,
        timestamp: Date.now()
      });
    } else if (msg.type === 'ping') {
      sendFrame(socket, { type: 'pong', timestamp: Date.now() });
    }
  } catch (e) {
    // Malformed frame or parse error
  }
}

// Construct and send RFC 6455 unmasked text frame to client
function sendFrame(socket, dataObj) {
  try {
    const payload = Buffer.from(JSON.stringify(dataObj), 'utf8');
    const length = payload.length;

    let header;
    if (length < 126) {
      header = Buffer.from([0x81, length]);
    } else if (length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    const frame = Buffer.concat([header, payload]);
    if (!socket.destroyed && socket.writable) {
      socket.write(frame);
    }
  } catch (err) {
    clients.delete(socket);
  }
}

// Broadcast message to clients
function broadcastMessage(payload) {
  let delivered = 0;
  const targetUser = payload.data?.user_id ?? payload.userId ?? null;
  const targetUsers = payload.data?.user_ids || payload.userIds || null;
  const targetRole = payload.data?.target_role || payload.targetRole || 'all';

  clients.forEach((client, socket) => {
    // Role / user filtering
    if (targetUser !== null && targetUser !== undefined && targetUser !== '') {
      if (!client.userId || Number(client.userId) !== Number(targetUser)) {
        return;
      }
    } else if (Array.isArray(targetUsers) && targetUsers.length > 0) {
      const numericIds = targetUsers.map(Number);
      if (!client.userId || !numericIds.includes(Number(client.userId))) {
        return;
      }
    }

    if (targetRole && targetRole !== 'all' && client.role !== 'all') {
      const isStaffTarget = targetRole === 'staff' && ['coordinator', 'core_member', 'member'].includes(client.role);
      if (client.role !== targetRole && !isStaffTarget) {
        return;
      }
    }

    sendFrame(socket, payload);
    delivered++;
  });

  return delivered;
}

// Helper to get active room participants count
function getActiveRoomCount(subEventId) {
  if (!subEventId) return clients.size;
  let count = 0;
  clients.forEach(c => {
    if (c.subEventId === Number(subEventId)) count++;
  });
  return count;
}

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ Team Mavericks Realtime WebSocket Server running on ws://localhost:${PORT}`);
  console.log(`📡 Broadcast webhook listening on http://localhost:${PORT}/broadcast`);
});

// Periodic ping to keep all connections active
setInterval(() => {
  clients.forEach((client, socket) => {
    sendFrame(socket, { type: 'ping', time: Date.now() });
  });
}, 30000);
