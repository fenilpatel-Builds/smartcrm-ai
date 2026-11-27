/**
 * Server-Sent Events (SSE) Real-Time Notification & Live Push Service
 */

// Registry of active client streams: Map<organizationId, Set<{ res, userId, id }>>
const clientRegistry = new Map();

/**
 * Registers an active HTTP response as an SSE event stream
 */
export const registerSseClient = (req, res, organizationId, userId) => {
  const orgIdStr = String(organizationId);

  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  });

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const clientObj = {
    id: clientId,
    res,
    userId: userId ? String(userId) : null,
  };

  if (!clientRegistry.has(orgIdStr)) {
    clientRegistry.set(orgIdStr, new Set());
  }
  clientRegistry.get(orgIdStr).add(clientObj);

  // Initial connection handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Periodic heartbeat keepalive (every 25s) to prevent intermediate proxy timeout
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatInterval);
    }
  }, 25000);

  // Cleanup on connection drop
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    const orgSet = clientRegistry.get(orgIdStr);
    if (orgSet) {
      orgSet.delete(clientObj);
      if (orgSet.size === 0) {
        clientRegistry.delete(orgIdStr);
      }
    }
  });
};

/**
 * Broadcasts an event to all connected clients in an organization
 */
export const broadcastNotification = (organizationId, eventType, data = {}) => {
  if (!organizationId) return;
  const orgIdStr = String(organizationId);
  const orgClients = clientRegistry.get(orgIdStr);

  if (!orgClients || orgClients.size === 0) {
    return;
  }

  const payload = JSON.stringify({
    event: eventType,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const client of orgClients) {
    try {
      client.res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
    } catch {
      orgClients.delete(client);
    }
  }
};

/**
 * Returns count of active SSE client streams
 */
export const getActiveSseCount = (organizationId) => {
  if (organizationId) {
    return clientRegistry.get(String(organizationId))?.size || 0;
  }
  let total = 0;
  for (const set of clientRegistry.values()) {
    total += set.size;
  }
  return total;
};
