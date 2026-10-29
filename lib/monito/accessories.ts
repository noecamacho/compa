// Accessories earned through badges, worn on the monito and drawn over the profile photo without touching the stored
// image. The golden cap is the first; a new one adds its id, its monito patch and its overlay placement here.
import { z } from "zod";
import { GOLDEN_CAP, type MonitoLook } from "./look";

export const ACCESSORIES = ["golden_cap"] as const;
export const Accessory = z.enum(ACCESSORIES);
export type Accessory = z.infer<typeof Accessory>;

// What each accessory changes on the monito.
export const ACCESSORY_LOOK: Record<Accessory, Partial<MonitoLook>> = { golden_cap: GOLDEN_CAP };

// Where each accessory sits over a round photo, as fractions of the photo's size (left/top of the overlay box, its
// width, and a tilt), so it scales from a 30 px ranking row to the 1920 px big screen.
export const ACCESSORY_PLACEMENT: Record<Accessory, { left: number; top: number; width: number; rotate: number }> = {
  golden_cap: { left: 0.06, top: -0.07, width: 0.88, rotate: -8 },
};

type Owner = { goldenCapAt: Date | null; showAccessories: boolean };

// Earned, whether or not they are shown.
export const unlockedAccessories = (owner: Pick<Owner, "goldenCapAt">): Accessory[] => (owner.goldenCapAt ? ["golden_cap"] : []);

// What the person wears in every view: what they earned, unless they chose to hide it.
export const accessoriesOf = (owner: Owner): Accessory[] => (owner.showAccessories ? unlockedAccessories(owner) : []);

export const wearing = (look: MonitoLook, accessories: readonly Accessory[] | undefined): MonitoLook =>
  (accessories ?? []).reduce<MonitoLook>((worn, accessory) => ({ ...worn, ...ACCESSORY_LOOK[accessory] }), look);
