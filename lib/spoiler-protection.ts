export function stageParticipantsRevealKnockoutOutcome(stage: string) {
  const round = stage.split("·")[0]?.trim() ?? "";
  return /^(final|third place)$/i.test(round);
}
