import sound from "@/lib/soundSynthesizer";

// Beautiful UI sound effects paired with the Black Fighters Motion System
export function playClick() {
  sound.playPress();
}

export function playSuccess() {
  sound.playCorrectChime();
}

export function playError() {
  sound.playWrongBuzz();
}

export function playLevelUp() {
  sound.playLevelUpFanfare();
}

export function playStreak() {
  sound.playStreakWhoosh();
}

export function playNotification() {
  sound.playNotification();
}

export function playHover() {
  sound.playPress();
}

export function playSwoosh() {
  sound.playStreakWhoosh();
}

export function playBladeSlash() {
  sound.playBladeSlash();
}

export { sound };
export default sound;