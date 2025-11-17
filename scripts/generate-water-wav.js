// scripts/generate-water-wav.js
// Generates a short mono WAV notification sound for hydration reminders.
const fs = require('fs');
const path = require('path');

function writeWav(filename, sampleRate, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // audio format PCM
  buffer.writeUInt16LE(1, 22); // channels mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(s * 32767), 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, buffer);
  console.log('WAV written:', filename);
}

function makeWaterSound(duration = 1.1, sr = 44100) {
  const n = Math.floor(duration * sr);
  const out = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const freq = 600 + 600 * (t / duration);
    const env = Math.exp(-4 * t) * Math.min(1, t * 6);
    const sine = Math.sin(2 * Math.PI * freq * t);
    const noise = (Math.random() * 2 - 1) * 0.03 * Math.exp(-8 * t);
    out[i] = (sine * 0.9 + noise) * env * 0.8;
  }

  return out;
}

const samples = makeWaterSound(1.1, 44100);
const assetOutputPath = path.join(__dirname, '..', 'assets', 'sounds', 'water_reminder.wav');
const webOutputPath = path.join(__dirname, '..', 'public', 'sounds', 'water_reminder.wav');
writeWav(assetOutputPath, 44100, samples);
writeWav(webOutputPath, 44100, samples);

console.log('\nIf you prefer base64, run:');
console.log(
  "node -e \"const fs=require('fs');const path=require('path');const data='<BASE64_BLOB>';const write=(p)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.from(data,'base64'));};write(path.join('assets','sounds','water_reminder.wav'));write(path.join('public','sounds','water_reminder.wav'));\"",
);
console.log('Full base64 string saved at scripts/water_sound_base64.txt');
