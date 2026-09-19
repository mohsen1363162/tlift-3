export type Theme = ReturnType<typeof makeTheme>;

export function makeTheme(dark: boolean) {
  return dark
    ? {
        dark: true,
        chrome: "bg-[#1f1f1f]",
        body: "bg-[#272727]",
        panel: "bg-[#2b2b2b]",
        text: "text-neutral-200",
        sub: "text-neutral-400",
        border: "border-neutral-700",
        hover: "hover:bg-white/10",
        tabActive: "bg-[#2f2f2f]",
        card: "border-neutral-600",
        input: "bg-[#1c1c1c] border-neutral-700 text-neutral-200",
        row: "hover:bg-white/[0.06]",
        head: "bg-[#2f2f2f]",
        bg: "bg-[#1c1c1c]",
      }
    : {
        dark: false,
        chrome: "bg-[#e9e9ea]",
        body: "bg-[#f5f5f5]",
        panel: "bg-white",
        text: "text-neutral-800",
        sub: "text-neutral-500",
        border: "border-neutral-300",
        hover: "hover:bg-black/5",
        tabActive: "bg-white",
        card: "border-neutral-300",
        input: "bg-white border-neutral-300 text-neutral-800",
        row: "hover:bg-black/[0.04]",
        head: "bg-neutral-100",
        bg: "bg-white",
      };
}
