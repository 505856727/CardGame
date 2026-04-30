const { PeerServer } = require('peer');

const port = process.env.PORT || 9000;

const server = PeerServer({
  host: '0.0.0.0',
  port,
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

console.log(`PeerJS Server running on port ${port}`);
