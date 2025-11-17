export function setupSoundListener() {
  if (typeof window === 'undefined' || !('navigator' in window)) {
    return;
  }

  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data?.type === 'play-notification-sound') {
      playSound();
    }
  });
}

async function playSound() {
  try {
    const audio = new Audio('/sounds/water_reminder.wav');
    audio.volume = 0.9;
    await audio.play();
  } catch (error) {
    console.warn('Audio playback blocked by browser policy', error);
  }
}
export function setupSoundListener() {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'play-notification-sound') {
      playBestEffortSound();
    }
  });
}

export async function playBestEffortSound() {
  try {
    const audio = new Audio('/sounds/water_reminder.mp3');
    audio.volume = 0.9;
    await audio.play();
  } catch (error) {
    console.warn('Browser blocked notification audio playback.', error);
  }
}

