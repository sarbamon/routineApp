let _ac: AudioContext | null = null;
let _unlocked = false;

export const unlockAudio = async () => {
  try {
    if (!_ac) {
      _ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (_ac.state === "suspended") {
      await _ac.resume();
    }
    const buf = _ac.createBuffer(1, 1, 22050);
    const src = _ac.createBufferSource();
    src.buffer = buf;
    src.connect(_ac.destination);
    src.start(0);
    _unlocked = true;
  } catch {}
};

const play = (fn: (ac: AudioContext) => void) => {
  if (!_unlocked || !_ac || _ac.state !== "running") return;
  try { fn(_ac); } catch {}
};

export const playMessageSound = () => play(ac => {
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.frequency.setValueAtTime(800, ac.currentTime);
  osc.frequency.setValueAtTime(1000, ac.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.3);
});

export const playRequestSound = () => play(ac => {
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ac.currentTime);
  osc.frequency.setValueAtTime(900, ac.currentTime + 0.15);
  osc.frequency.setValueAtTime(700, ac.currentTime + 0.3);
  gain.gain.setValueAtTime(0.3, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.5);
});

export const playTodoSound = () => play(ac => {
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = "triangle";
  osc.frequency.setValueAtTime(500, ac.currentTime);
  osc.frequency.setValueAtTime(700, ac.currentTime + 0.2);
  gain.gain.setValueAtTime(0.2, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.4);
});