// Switch the Capacitor Android app between live development and release builds.
//
//   npm run cap:live     (USB, recommended) The app loads http://localhost:5173 and adb
//                        forwards the phone's localhost to this PC over the USB cable.
//                        Edits show up on the phone instantly.
//   npm run cap:usb      Only re-create the USB forward (after unplugging/reconnecting).
//   npm run cap:wifi     Same as live, but over Wi-Fi (http://<LAN IP>:5173). Needs phone
//                        and PC on the same network, no router client isolation, and the
//                        firewall allowing port 5173.
//   npm run cap:release  Removes the dev server URL, builds the bundled app
//                        (API = VITE_API_BASE_URL from .env.production) and syncs it.
//
// After live/wifi/release, press Run in Android Studio. Keep `npm run dev` running for live/wifi.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'capacitor.config.json');
const mode = process.argv[2];
const PORT = process.env.DEV_PORT || 5173;
const config = JSON.parse(readFileSync(configPath, 'utf8'));

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

// First private IPv4 address that is not a virtual adapter (Hyper-V, WSL, Docker, VPN)
function lanAddress() {
  const skip = /(vethernet|virtual|vmware|docker|wsl|hyper-v|loopback|vpn|tailscale)/i;
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    if (skip.test(name)) continue;
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal && /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))\./.test(a.address)) {
        return a.address;
      }
    }
  }
  return null;
}

// adb from the Android SDK (default install path) or PATH
function adbCommand() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
    (process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : '');
  const candidate = sdk ? join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : '';
  return candidate && existsSync(candidate) ? `"${candidate}"` : 'adb';
}

// Forward the phone's localhost:<PORT> to this PC over USB
function usbForward() {
  const adb = adbCommand();
  try {
    const lines = execSync(`${adb} devices`, { encoding: 'utf8' }).split(/\r?\n/).slice(1);
    const devices = lines.filter((l) => /\tdevice\s*$/.test(l));
    if (!devices.length) {
      console.warn('No Android device found over USB. Connect the phone with USB debugging on, then run: npm run cap:usb');
      return false;
    }
    execSync(`${adb} reverse tcp:${PORT} tcp:${PORT}`, { stdio: 'inherit' });
    console.log(`USB forward active: phone localhost:${PORT} -> this PC`);
    return true;
  } catch (err) {
    console.warn(`Could not set up the USB forward (${err.message}). Is the Android SDK / adb installed?`);
    return false;
  }
}

// Point the app at a dev server URL and sync
function setLive(url) {
  config.server = { url, cleartext: true };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  // A bundle must exist for sync, but the app will load the dev server instead
  run('npx vite build --logLevel warn');
  run('npx cap sync android');
}

if (mode === 'usb') {
  process.exit(usbForward() ? 0 : 1);
} else if (mode === 'live') {
  setLive(`http://localhost:${PORT}`);
  usbForward();
  console.log(`\nLive mode (USB): the Android app loads http://localhost:${PORT} through the USB cable.`);
  console.log('Keep `npm run dev` running, then press Run in Android Studio.');
} else if (mode === 'wifi') {
  const ip = process.env.DEV_HOST || lanAddress();
  if (!ip) {
    console.error('Could not detect a Wi-Fi/LAN IP address. Set DEV_HOST=<your PC IP> and try again.');
    process.exit(1);
  }
  setLive(`http://${ip}:${PORT}`);
  console.log(`\nLive mode (Wi-Fi): the Android app now loads http://${ip}:${PORT}`);
  console.log('Keep `npm run dev` running, then press Run in Android Studio.');
  console.log('If the phone cannot connect, use USB instead: npm run cap:live');
} else if (mode === 'release') {
  delete config.server;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  run('npx vite build');
  run('npx cap sync android');
  console.log('\nRelease mode: the Android app uses the bundled build and the deployed API.');
} else {
  console.error('Usage: node scripts/cap-mode.mjs <live|usb|wifi|release>');
  process.exit(1);
}
