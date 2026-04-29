const { PeerServer } = require('peer');

const server = PeerServer({
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

console.log('PeerJS Server running on http://localhost:9000/cardgame');
