// Writes mobile/assets/sounds/fake-call-ring.wav: one loopable cycle of a
// double-ring phone tone (400 Hz + 450 Hz, 0.4 s on, 0.2 s off, 0.4 s on,
// 2 s off), synthesized so the asset carries no third-party licence.
//
// Usage: node scripts/gen-fake-call-ring.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050;
const AMPLITUDE = 0.6;
// Short fades stop the bursts from clicking at their edges.
const FADE_SECONDS = 0.01;
// [start, end] of each ring burst within the 3 s cycle, in seconds.
const BURSTS = [
  [0, 0.4],
  [0.6, 1.0],
];
const CYCLE_SECONDS = 3;
const FREQUENCIES = [400, 450];

function sampleAt(time) {
  const burst = BURSTS.find(([start, end]) => time >= start && time < end);
  if (!burst) return 0;
  const [start, end] = burst;
  const envelope = Math.min(1, (time - start) / FADE_SECONDS, (end - time) / FADE_SECONDS);
  const tone =
    FREQUENCIES.reduce((sum, hz) => sum + Math.sin(2 * Math.PI * hz * time), 0) /
    FREQUENCIES.length;
  return AMPLITUDE * envelope * tone;
}

function wav(samples) {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => {
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  });
  return buffer;
}

const samples = Array.from({ length: SAMPLE_RATE * CYCLE_SECONDS }, (_, index) =>
  sampleAt(index / SAMPLE_RATE)
);
const out = fileURLToPath(new URL('../mobile/assets/sounds/fake-call-ring.wav', import.meta.url));
writeFileSync(out, wav(samples));
console.log(`Wrote ${out}`);
