// Shared speaker output for the mirror. The speaker is wired to the RIGHT
// channel of HDMI audio only, so every sound is rendered mono -> right.
// Volume (0-100) is stored in audio-settings.json and applied in software.
var fs = require("fs");
var os = require("os");
var path = require("path");
var childProcess = require("child_process");

var SETTINGS_FILE = path.join(__dirname, "audio-settings.json");
var DEVICE = "hdmi:CARD=vc4hdmi,DEV=0";
var RATE = 48000;
var DEFAULT_VOLUME = 25;
var current = null;

function getVolume() {
  try {
    var v = Number(JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")).volume);
    if (isFinite(v)) return Math.max(0, Math.min(100, Math.round(v)));
  } catch (e) { /* use default */ }
  return DEFAULT_VOLUME;
}

function setVolume(volume) {
  var v = Math.max(0, Math.min(100, Math.round(Number(volume))));
  if (!isFinite(v)) throw new Error("Invalid volume");
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ volume: v }));
  return v;
}

// Pattern = list of [frequencyHz, seconds]; frequency 0 is silence.
var PATTERNS = {
  test: [[440, 0.6]],
  alarm: (function () {
    var p = [];
    for (var round = 0; round < 16; round++) {
      for (var beep = 0; beep < 4; beep++) { p.push([988, 0.12]); p.push([0, 0.1]); }
      p.push([0, 0.7]);
    }
    return p;
  })()
};

function buildWav(pattern, volume) {
  // Quadratic curve gives finer control at the quiet end. 25 ~= 4% of full scale.
  var amp = 0.6 * Math.pow(volume / 100, 2) * 32767;
  var samples = [];
  pattern.forEach(function (seg) {
    var n = Math.round(seg[1] * RATE);
    var fade = Math.min(Math.round(0.01 * RATE), Math.floor(n / 2));
    for (var i = 0; i < n; i++) {
      var env = Math.min(1, i / fade, (n - 1 - i) / fade);
      samples.push(seg[0] ? Math.round(amp * env * Math.sin(2 * Math.PI * seg[0] * i / RATE)) : 0);
    }
  });
  var data = Buffer.alloc(samples.length * 4); // stereo 16-bit: left = 0, right = tone
  samples.forEach(function (s, i) { data.writeInt16LE(s, i * 4 + 2); });
  var header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 4, 28); header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function stop() {
  if (current) { try { current.kill(); } catch (e) { /* already gone */ } current = null; }
}

function play(name) {
  var pattern = PATTERNS[name];
  var volume = getVolume();
  if (!pattern || volume === 0) return false;
  stop();
  var file = path.join(os.tmpdir(), "mirror-sound-" + name + ".wav");
  try { fs.writeFileSync(file, buildWav(pattern, volume)); } catch (e) { return false; }
  var child = childProcess.execFile("aplay", ["-q", "-D", DEVICE, file], { timeout: 40000 }, function (error) {
    if (error && !error.killed) console.error("[audio] aplay failed: " + error.message);
    if (current === child) current = null;
  });
  current = child;
  return true;
}

module.exports = { play: play, stop: stop, getVolume: getVolume, setVolume: setVolume };
