import { useSettingStore } from "@/stores";

export interface LyricFontConfig {
  name: string;
  keySetting: "LyricFont" | "japaneseLyricFont" | "englishLyricFont" | "koreanLyricFont";
  default: string;
  tip: string;
}

export interface LyricLangFontConfig extends LyricFontConfig {
  keyCss: string;
}

export const lyricLangFontConfigs: LyricLangFontConfig[] = [
  {
    name: "English lyric font",
    keySetting: "englishLyricFont",
    keyCss: "--en-font-family",
    default: "follow",
    tip: "Font used when lyrics contain English",
  },
  {
    name: "Japanese lyric font",
    keySetting: "japaneseLyricFont",
    keyCss: "--ja-font-family",
    default: "follow",
    tip: "Font used when lyrics contain Japanese",
  },
  {
    name: "Korean lyric font",
    keySetting: "koreanLyricFont",
    keyCss: "--ko-font-family",
    default: "follow",
    tip: "Font used when lyrics contain Korean",
  },
];

export const lyricFontConfigs: LyricFontConfig[] = [
  {
    name: "Lyric area font",
    keySetting: "LyricFont",
    default: "follow",
    tip: "Base font for the main lyric area",
  },
  ...lyricLangFontConfigs,
];

export const lyricLangFontStyle = (settingStore = useSettingStore()) => {
  return Object.fromEntries(
    lyricLangFontConfigs.map((c) => {
      const settingValue = settingStore[c.keySetting];
      return [c.keyCss, settingValue !== c.default ? settingValue : ""];
    }),
  );
};
