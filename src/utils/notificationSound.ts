// Create a notification sound using Web Audio API
let audioContext: AudioContext | null = null;

export const playNotificationSound = () => {
  try {
    // Create audio context lazily
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume context if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const currentTime = audioContext.currentTime;

    // Create oscillator for the notification tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Pleasant notification sound - two-tone chime
    oscillator.frequency.setValueAtTime(880, currentTime); // A5
    oscillator.frequency.setValueAtTime(1318.5, currentTime + 0.1); // E6
    oscillator.frequency.setValueAtTime(1760, currentTime + 0.2); // A6
    
    oscillator.type = 'sine';

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.25, currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.4);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.4);

    console.log('Notification sound played');
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Alternative: Play a second "success" sound
export const playSuccessSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const currentTime = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Rising success tone
    oscillator.frequency.setValueAtTime(523.25, currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, currentTime + 0.08); // E5
    oscillator.frequency.setValueAtTime(783.99, currentTime + 0.16); // G5
    
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.3);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.3);
  } catch (error) {
    console.error('Error playing success sound:', error);
  }
};
