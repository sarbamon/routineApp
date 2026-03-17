// Generate notification sounds using Web Audio API — no files needed
const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

export const playMessageSound = () => {
  try {
    const ac  = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.frequency.setValueAtTime(800, ac.currentTime);
    osc.frequency.setValueAtTime(1000, ac.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.3);
  } catch {}
};

export const playRequestSound = () => {
  try {
    const ac   = ctx();
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
  } catch {}
};

export const playTodoSound = () => {
  try {
    const ac   = ctx();
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
  } catch {}
};