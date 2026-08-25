import { FontAwesome6 } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { PainLevel } from "@/constants/pain-levels";
import { usePainColor } from "@/hooks/use-pain-color";

const ICON_NAMES: Record<
  PainLevel,
  ComponentProps<typeof FontAwesome6>["name"]
> = {
  1: "face-meh",
  2: "face-frown",
  3: "face-grimace",
  4: "face-dizzy",
};

export type PainFaceIconProps = {
  level: PainLevel;
  size?: number;
};

export function PainFaceIcon({ level, size = 32 }: PainFaceIconProps) {
  const color = usePainColor(level);

  // 塗りつぶし（Solid）スタイルの指定は `solid` ブール値で行う。
  // `iconStyle="solid"` は型チェックを通るが実行時には無視され、
  // FontAwesome6Free-Regular（線画）のまま描画されるので注意。
  return <FontAwesome6 name={ICON_NAMES[level]} solid size={size} color={color} />;
}
