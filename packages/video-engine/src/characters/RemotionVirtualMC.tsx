import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionWord } from "@storytoon/shared-types";
import { DuoMascot, type MascotEmotion, type MascotMouth, type MascotPose } from "./DuoMascot";
import {
  AuthenticDuolingo,
  type DuolingoCharacterId,
  type DuoMood,
} from "./AuthenticDuolingo";
import {
  StickmanMascot,
  type StickmanGender,
  type StickmanMood,
  type StickmanArmPose,
} from "./StickmanMascot";
import { DEFAULT_MALE_RIG, visemeForTime, type StickmanRig } from "./stickman-rig";

export interface RemotionVirtualMCProps {
  /** Mode: "stickman" (Mark Kacy / Storyteller style), "authentic" (Duolingo), "custom_rig" */
  characterType?: "stickman" | "authentic" | "custom_rig";

  // Stickman options (Reel / Mark Kacy style)
  /** Character exported from the Stickman Studio editor (JSON). */
  stickmanRig?: StickmanRig;
  stickmanGender?: StickmanGender;
  stickmanMood?: StickmanMood;
  stickmanArmPose?: StickmanArmPose;
  shirtColor?: string;

  // Duolingo options
  duolingoCharacter?: DuolingoCharacterId;
  duoMood?: DuoMood;

  // Custom rig options
  emotion?: MascotEmotion;
  pose?: MascotPose;
  mouth?: MascotMouth;
  words?: CaptionWord[];
  position?: "bottom-left" | "bottom-right" | "bottom-center";
  size?: number; // width in px
  hasBowtie?: boolean;
  hasGlasses?: boolean;
  flipHorizontal?: boolean;
}

/**
 * Remotion-aware Virtual MC component.
 * Automatically computes:
 * 1. Lip-sync mouth shapes/talk-cycle from Whisper CaptionWord timestamps.
 * 2. Natural auto-blinking.
 * 3. Continuous frame-locked squash & stretch bounce.
 */
export const RemotionVirtualMC: React.FC<RemotionVirtualMCProps> = ({
  characterType = "stickman",
  stickmanRig = DEFAULT_MALE_RIG,
  stickmanGender = "male",
  stickmanMood = "side_eye",
  stickmanArmPose = "hip",
  shirtColor,
  duolingoCharacter = "duo",
  duoMood = "waving",
  emotion = "neutral",
  pose = "idle",
  mouth,
  words = [],
  position = "bottom-left",
  size = 280,
  hasBowtie = true,
  hasGlasses = false,
  flipHorizontal = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeMs = (frame / fps) * 1000;

  // 1. Detect if current frame falls within any spoken word
  const activeWord = words.find(
    (w) => currentTimeMs >= w.startMs && currentTimeMs <= w.endMs
  );
  const isSpeaking = Boolean(activeWord);

  // 2. Auto-blink every 90 frames (~3s at 30fps), blink duration = 4 frames
  const isBlinking = frame % 90 < 4;

  // 3. Position styles
  let posClass = "left-6 bottom-4";
  if (position === "bottom-right") posClass = "right-6 bottom-4";
  if (position === "bottom-center") posClass = "left-1/2 -translate-x-1/2 bottom-4";

  return (
    <div className={`absolute z-30 pointer-events-none select-none ${posClass}`}>
      {characterType === "stickman" ? (
        <StickmanMascot
          rig={stickmanRig}
          gender={stickmanGender}
          mood={stickmanMood}
          armPose={stickmanArmPose}
          shirtColor={shirtColor}
          isSpeaking={isSpeaking}
          viseme={visemeForTime(words, currentTimeMs)}
          bouncy={true}
          tick={frame}
          width={size}
          height={size * 1.3}
          flipHorizontal={flipHorizontal}
          hasGlasses={hasGlasses}
        />
      ) : characterType === "authentic" ? (
        <AuthenticDuolingo
          character={duolingoCharacter}
          duoMood={duoMood}
          isSpeaking={isSpeaking}
          bouncy={true}
          tick={frame}
          width={size}
          height={size * 1.15}
          flipHorizontal={flipHorizontal}
        />
      ) : (
        <DuoMascot
          emotion={emotion}
          pose={pose}
          mouth={mouth}
          isSpeaking={isSpeaking}
          isBlinking={isBlinking}
          bouncy={true}
          tick={frame}
          width={size}
          height={size * 1.16}
          hasBowtie={hasBowtie}
          hasGlasses={hasGlasses}
        />
      )}
    </div>
  );
};
