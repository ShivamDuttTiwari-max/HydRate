export function setupSoundListener() {
  if (typeof window === 'undefined' || !('navigator' in window) || !navigator.serviceWorker) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'play-notification-sound') {
      playBestEffortSound();
    }
  });
}

export async function playBestEffortSound() {
  try {
    // Try MP3 first (better browser support)
    const audio = new Audio('/sounds/water_reminder.mp3');
    audio.volume = 0.9;
    await audio.play().catch(async (mp3Error) => {
      console.warn('MP3 playback failed, trying WAV...', mp3Error);
      // Fallback to WAV if MP3 fails
      const fallbackAudio = new Audio('/sounds/water_reminder.wav');
      fallbackAudio.volume = 0.9;
      await fallbackAudio.play();
    });
  } catch (error) {
    console.warn('All audio playback attempts failed.', error);
  }
}

