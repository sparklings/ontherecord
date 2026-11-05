export const AUDIO_EXTENSIONS: readonly string[] = ["m4a", "mp3", "wav", "aac", "ogg"];

export function isSupportedAudioExtension(extension: string): boolean {
	return AUDIO_EXTENSIONS.includes(extension.toLowerCase());
}
