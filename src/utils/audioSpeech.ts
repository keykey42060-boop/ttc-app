/**
 * High-accessibility sound chime and speech synthesis helper
 */

// Web Audio API chime generator for clear, pleasant auditory feedback
export function playChime(type: 'alert' | 'arrival' | 'gentle' = 'gentle') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'arrival') {
      // Pleasant 3-note ascending chime (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.15);
        gain.gain.setValueAtTime(0.001, now + index * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.3, now + index * 0.15 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.15 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 0.5);
      });
    } else if (type === 'alert') {
      // Clear 2-note attention chime (A4 -> C#5)
      const freqs = [440, 554.37];
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.18);
        gain.gain.setValueAtTime(0.001, now + index * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.35, now + index * 0.18 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.18);
        osc.stop(now + index * 0.18 + 0.45);
      });
    } else {
      // Gentle single confirmation chime (G5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.warn('Audio chime could not play:', err);
  }
}

// Spoken voice readout using native SpeechSynthesis
export function speakAnnouncement(text: string, rate: number = 0.85) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported on this browser.');
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Cancel any existing queue
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate; // Slower rate by default for senior clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Choose high-quality natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

// Stop any active speech
export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Trigger device vibration if supported
export function triggerVibration(pattern: number[] = [200, 100, 200]) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore silently if blocked
    }
  }
}

// Request real OS notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
  return false;
}

// Send real OS notification if permission is granted
export function sendOsNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=128&q=80',
        badge: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=128&q=80',
      });
    } catch {
      // ignore
    }
  }
}
