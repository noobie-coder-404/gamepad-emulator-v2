const dgram = require('dgram');
const os = require('os');
const { performance } = require('perf_hooks');
const qrcode = require('qrcode');

const MIN_CODE = 10000;
const MAX_CODE = 65534;

function getLocalIp() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      const isIPv4 = iface.family === 'IPv4' || iface.family === 4;

      if (!isIPv4 || iface.internal) continue;

      if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
        return iface.address;
      }
    }
  }

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      const isIPv4 = iface.family === 'IPv4' || iface.family === 4;
      if (isIPv4 && !iface.internal) return iface.address;
    }
  }

  return '127.0.0.1';
}

function generateCode() {
  return Math.floor(Math.random() * (MAX_CODE - MIN_CODE + 1)) + MIN_CODE;
}

function printQrCode(name) {
  const isIos = process.argv.includes('ios');
  const myIp = getLocalIp();
  const code = isIos ? 12345 : generateCode();
  const payload = JSON.stringify({ ip: myIp, code, name });

  console.log(`PC name: ${name}`);
  console.log(`\ndYZr PC Local IP Address found: ${myIp}`);
  console.log(`Pairing code: ${code}`);
  console.log('Generating QR code...\n');

  qrcode.toString(payload, { type: 'terminal', small: true }, (err, qrString) => {
    if (err) {
      console.error('Failed to generate QR code:', err);
      return;
    }

    console.log(qrString);
    console.log('Scan this with your phone to connect!');
  });

  return code;
}

/*
let ViGEmClient;
try {
  ViGEmClient = require('vigemclient');
} catch (err) {
  console.error("Startup error: 'vigemclient' is not installed.");
  process.exit(1);
}
*/

// --- CONFIGURATION ---
const PC_NAME = null;
const UDP_IP = '0.0.0.0';
const UDP_PORT = 5005;
const RESOLVED_PC_NAME = PC_NAME ?? os.hostname();
const PACKET_COUNT = 16;
const INPUT_VALUE_COUNT = PACKET_COUNT - 2;
const PHONE_ID_INDEX = PACKET_COUNT - 1;
const SNAPSHOT_LEN = PACKET_COUNT * 2;

// Print the QR Code directly for testing
const pairingCode = printQrCode(RESOLVED_PC_NAME);
const connectedPhones = new Set();

const socket = dgram.createSocket('udp4');

socket.on('message', (msg) => {
  // 1. CONVERSION
  const packet = [];
  for (let i = 0; i < msg.length; i += 2) {
    packet.push(msg.readUInt16BE(i));
  }

  // Detect and log pairing bursts
  if (
    packet.length === PACKET_COUNT &&
    packet.slice(0, 15).every((val) => val === pairingCode)
  ) {
    const phoneId = packet[PHONE_ID_INDEX];
    if (!connectedPhones.has(phoneId)) {
      console.log(`\n✅ Connected to phone! (ID: ${phoneId})`);
      connectedPhones.add(phoneId);
    }
    console.log(`\n[UDP] Pairing burst received from Phone ${phoneId}:`, packet);
    return;
  }

  // Ignore malformed packets
  if (msg.length !== SNAPSHOT_LEN) {
    console.log('receiving invalid packets');
    return;
  }

  // 2. CHECK PAIRING CODE
  const packetCode = packet[INPUT_VALUE_COUNT];
  const phoneId = packet[PHONE_ID_INDEX];
  const isRelease = packet.slice(0, 15).every((val) => val === 65535);

  if (packetCode === pairingCode || isRelease) {
    if (!isRelease && !connectedPhones.has(phoneId)) {
      console.log(`\n✅ Connected to phone! (ID: ${phoneId})`);
      connectedPhones.add(phoneId);
    }
    console.log(
      isRelease
        ? `\n[RELEASE] All inputs zeroed by Phone ${phoneId}.`
        : `[UDP Packet from Phone ${phoneId}]`,
      packet
    );
  } else {
    console.log('receiving invalid packets');
  }
});

socket.on('error', (err) => {
  console.error(`\n❌ Server error:\n${err.message}`);
  socket.close();
});

socket.bind(UDP_PORT, UDP_IP, () => {
  console.log(`\nServer listening for UDP packets on Port ${UDP_PORT}...`);
});

function shutdown() {
  console.log('\nShutting down receiver...');
  socket.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
