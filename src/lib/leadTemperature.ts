import { Flame, Sun, Snowflake, type LucideIcon } from 'lucide-react';

/**
 * Lead temperature values set by AI during conversation summarization.
 * These are stored in the dedicated `leadTemperature` field on the customer document.
 */
export const LEAD_TEMPERATURE_TAGS = ['Hot', 'Warm', 'Cold'] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURE_TAGS)[number];

export function isLeadTemperatureTag(tag: string): tag is LeadTemperature {
  return (LEAD_TEMPERATURE_TAGS as readonly string[]).includes(tag);
}

export function isReservedTemperatureTag(tag: string): boolean {
  return ['hot', 'warm', 'cold'].includes(tag.trim().toLowerCase());
}

type LeadTemperatureStyle = {
  icon: LucideIcon;
  bg: string;
  text: string;
  iconClass: string;
};

const LEAD_TEMPERATURE_STYLES: Record<LeadTemperature, LeadTemperatureStyle> = {
  Hot: {
    icon: Flame,
    bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none',
    text: 'text-zinc-800 dark:text-zinc-200',
    iconClass: 'text-red-500 dark:text-red-400',
  },
  Warm: {
    icon: Sun,
    bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none',
    text: 'text-zinc-800 dark:text-zinc-200',
    iconClass: 'text-amber-500 dark:text-amber-400',
  },
  Cold: {
    icon: Snowflake,
    bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none',
    text: 'text-zinc-800 dark:text-zinc-200',
    iconClass: 'text-sky-500 dark:text-sky-400',
  },
};

export function getLeadTemperatureStyle(tag: LeadTemperature): LeadTemperatureStyle {
  return LEAD_TEMPERATURE_STYLES[tag];
}
