export type AvatarOption = {
  id: string;
  name: string;
  previewUrl?: string;
};

export type VoiceOption = {
  id: string;
  name: string;
  language: string;
  gender: string;
  description?: string;
};

export type LanguageOption = {
  code: string;
  name: string;
};

export type AvatarConfiguration = {
  configured: boolean;
  enabled: boolean;
  avatarName?: string;
  avatarPreviewUrl?: string;
  coverImageUrl?: string;
  backgroundUrl?: string;
  backgroundType?: 'image' | 'video';
  voiceName?: string;
  voiceLanguage?: string;
  voiceGender?: string;
  language: string;
  embedUrl?: string;
  updatedAt: number;
};
