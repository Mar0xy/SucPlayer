import type { SongLevelType } from "@/types/main";
import type { ImageRenderToolbarProps } from "naive-ui";
import { reduce } from "lodash-es";

// 音质数据
export const songLevelData = {
  l: {
    level: "standard",
    name: "Standard Quality",
    shortName: "STD",
  },
  m: {
    level: "higher",
    name: "High Quality",
    shortName: "HQ",
  },
  h: {
    level: "exhigh",
    name: "Very High Quality",
    shortName: "VHQ",
  },
  sq: {
    level: "lossless",
    name: "Lossless Quality",
    shortName: "Lossless",
  },
  hr: {
    level: "hires",
    name: "Hi-Res",
    shortName: "Hi-Res",
  },
  je: {
    level: "jyeffect",
    name: "High-Fidelity Effect",
    shortName: "HF",
  },
  sk: {
    level: "sky",
    name: "Immersive Surround",
    shortName: "Immersive",
  },
  db: {
    level: "dolby",
    name: "Dolby Atmos",
    shortName: "Dolby",
  },
  jm: {
    level: "jymaster",
    name: "Master Quality",
    shortName: "Master",
  },
};

/** AI 增强音质 Level（需要过滤的音质） */
export const AI_AUDIO_LEVELS = ["jymaster", "sky", "jyeffect", "vivid"];

/** AI 增强音质 Key（需要过滤的 key） */
export const AI_AUDIO_KEYS = ["jm", "sk", "je"];

/** Fuck DJ Mode 关键词 */
export const DJ_MODE_KEYWORDS = ["DJ", "抖音", "0.9", "0.8", "网红", "车载", "热歌", "慢摇"];

/** 歌曲脏标（Explicit Content）位掩码 */
export const EXPLICIT_CONTENT_MARK = 1048576;

/**
 * 获取音质列表
 * @param level 音质等级数据
 * @param quality 歌曲音质详情
 * @returns 格式化后的音质列表
 */
export const getSongLevelsData = (
  level: Partial<typeof songLevelData>,
  quality?: Record<string, any>,
): {
  name: string;
  level: string;
  value: SongLevelType;
  br?: number;
  size?: number;
}[] => {
  if (!level) return [];
  return reduce(
    level,
    (
      result: {
        name: string;
        level: string;
        value: SongLevelType;
        br?: number;
        size?: number;
      }[],
      value,
      key,
    ) => {
      // 如果没有 quality 数据，则默认显示所有 level
      // 如果有 quality 数据，则只显示 quality 中存在的 level
      if (value && (!quality || quality[key])) {
        result.push({
          name: value.name,
          level: value.level,
          value: key as SongLevelType,
          br: quality?.[key]?.br,
          size: quality?.[key]?.size,
        });
      }
      return result;
    },
    [],
  );
};

/**
 * 排序字段选项
 */
export const sortFieldOptions = {
  default: { name: "Default" },
  title: { name: "Title" },
  artist: { name: "Artist" },
  album: { name: "Album" },
  trackNumber: { name: "Track Number" },
  filename: { name: "Filename" },
  duration: { name: "Duration" },
  size: { name: "Size" },
  createTime: { name: "Added Time" },
  updateTime: { name: "Modified Time" },
} as const;

/**
 * 排序方式选项
 */
export const sortOrderOptions = {
  default: { name: "Default" },
  asc: { name: "Ascending" },
  desc: { name: "Descending" },
} as const;

/**
 * 渲染图片工具栏
 * @param nodes 图片工具栏节点
 * @returns 图片工具栏
 */
export const renderToolbar = ({ nodes }: ImageRenderToolbarProps) => {
  return [
    nodes.prev,
    nodes.next,
    nodes.rotateCounterclockwise,
    nodes.rotateClockwise,
    nodes.resizeToOriginalSize,
    nodes.zoomOut,
    nodes.zoomIn,
    nodes.download,
    nodes.close,
  ];
};

/**
 * AMLL TTML DB Server 列表
 * @returns AMLL TTML DB Server 列表
 */
export const amllDbServers = [
  {
    label: "[Recommended] GitHub Official Repository",
    description: "Official source with timely updates, but access may be slower",
    value:
      "https://raw.githubusercontent.com/Steve-xmh/amll-ttml-db/refs/heads/main/ncm-lyrics/%s.ttml",
  },
  {
    label: "AMLL TTML DB Service (SteveXMH)",
    description: "Official mirror provided by the author (free quota may be limited) 😂",
    value: "https://amll-ttml-db.stevexmh.net/ncm/%s",
  },
  {
    label: "[Default] AMLL TTML DB Mirror (HelloZGY)",
    description: "Community mirror provided by HelloZGY",
    value: "https://amlldb.bikonoo.com/ncm-lyrics/%s.ttml",
  },
  {
    label: "Dimeta Mirror v1 (Luorix)",
    description: "Community mirror provided by Luorix",
    value: "https://amll.mirror.dimeta.top/api/db/ncm-lyrics/%s.ttml",
  },
  {
    label: "JSDMirror GitHub Mirror",
    description: "A platform offering free CDN mirror services for frontend static assets",
    value: "https://cdn.jsdmirror.cn/gh/Steve-xmh/amll-ttml-db@main/ncm-lyrics/%s.ttml",
  },
] as const;

/**
 * 默认 AMLL TTML DB Server
 * @returns 默认 AMLL TTML DB Server
 */
export const defaultAMLLDbServer = amllDbServers[2].value;
