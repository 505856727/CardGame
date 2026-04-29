const { PeerServer } = require('peer');

const server = PeerServer({
  host: '0.0.0.0',
  port: 9000,
  path: '/cardgame',
  allow_discovery: true,
  corsOptions: {
    origin: '*',
  },
});

server.on('connection', (client) => {
  console.log(`[PeerServer] Connected: ${client.getId()}`);
});

server.on('disconnect', (client) => {
  console.log(`[PeerServer] Disconnected: ${client.getId()}`);
});

const os = require('os');
const nets = os.networkInterfaces();
const lanIp = Object.values(nets).flat().find(
  (i) => i?.family === 'IPv4' && !i.internal
)?.address ?? 'unknown';

console.log(`PeerJS Server running on:`);
console.log(`  Local:   http://localhost:9000/cardgame`);
console.log(`  LAN:     http://${lanIp}:9000/cardgame`);
