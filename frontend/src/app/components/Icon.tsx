
import {
  Accessibility, ArrowUpRight, BookOpen, Bookmark, Building2, Camera,
  Check, CheckCircle2, ChevronLeft, ChevronRight, Compass, FileText,
  FlaskConical, Globe, GraduationCap, Heart, Home, Lightbulb, Link2,
  Mail, Menu, MessageCircle, MapPin, Palette, PartyPopper, Phone, Puzzle,
  Scale, School, Search, Share2, ShieldCheck, SlidersHorizontal, Sparkles,
  Sprout, Star, Sun, Trophy, TrendingUp, Users, X, UserRound,
  CalendarDays, Trees, type LucideProps,
} from "lucide-react";

const ICONS = {
  accessibility: Accessibility,
  arrowUpRight: ArrowUpRight,
  book: BookOpen,
  bookmark: Bookmark,
  building: Building2,
  camera: Camera,
  check: Check,
  checkCircle: CheckCircle2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  compass: Compass,
  file: FileText,
  flask: FlaskConical,
  globe: Globe,
  graduation: GraduationCap,
  heart: Heart,
  home: Home,
  bulb: Lightbulb,
  link: Link2,
  mail: Mail,
  menu: Menu,
  message: MessageCircle,
  mapPin: MapPin,
  palette: Palette,
  party: PartyPopper,
  phone: Phone,
  puzzle: Puzzle,
  scale: Scale,
  school: School,
  search: Search,
  share: Share2,
  shield: ShieldCheck,
  filters: SlidersHorizontal,
  sparkles: Sparkles,
  sprout: Sprout,
  star: Star,
  sun: Sun,
  trophy: Trophy,
  trending: TrendingUp,
  users: Users,
  x: X,
  youtube: Share2,
  facebook: Share2,
  instagram: Camera,
  linkedin: Link2,
  twitter: Share2,
  x_social: Share2,
  user: UserRound,
  calendar: CalendarDays,
  trees: Trees,
} as const;

export type IconName = keyof typeof ICONS;

export default function Icon({
  name,
  className = "h-5 w-5",
  filled,
  ...rest
}: { name: string; className?: string; filled?: boolean } & LucideProps) {
  const C =
    (ICONS as Record<string, React.ComponentType<LucideProps>>)[name] ??
    Sparkles;

  return (
    <C
      aria-hidden
      className={className}
      {...(filled ? { fill: "currentColor" } : {})}
      {...rest}
    />
  );
}

export function Stars({
  value,
  className = "h-5 w-5",
}: {
  value: number;
  className?: string;
}) {
  const full = Math.round(value);

  return (
    <span
      className="inline-flex gap-0.5"
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={`${className} ${
            n <= full
              ? "fill-[#E99A24] text-[#E99A24]"
              : "fill-[#E1E7EE] text-[#E1E7EE]"
          }`}
        />
      ))}
    </span>
  );
}
