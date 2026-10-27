import { v } from "convex/values";
export const textStyle = v.object({
  color: v.string(),
  size: v.number(),
  decoration: v.union(
    v.literal("plain"),
    v.literal("bold"),
    v.literal("italic"),
    v.literal("underline"),
    v.literal("shadow"),
  ),
});
export const textStyles = v.object({
  name: textStyle,
  headline: textStyle,
  subtitle: textStyle,
});
