import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { usePersona } from "@/hooks/use-persona";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  User,
  Clock,
  Star,
  Phone,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  Globe,
  Building2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface Member {
  code: string;
  name: string;
  nameAr: string;
  iqamaNo: string;
  policyNumber: string;
  employerName: string;
  insurerName: string;
  planTier: string;
  nationality: string;
  age: number;
  gender: string;
  city: string;
  region: string;
  dependentsCount: number;
  policyValidUntil: string;
}

interface MemberResponse {
  member: Member;
  generatedAt: string;
}

interface Provider {
  code: string;
  name: string;
  nameAr: string;
  type: string;
  rating: number;
  reviewCount: number;
  waitTimeMinutes: number;
  specialties: string[];
  languages: string[];
  workingHours: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  region: string;
  acceptedInsurers: string[];
}

interface ProvidersResponse {
  data: Provider[];
  generatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

// ── Main Component ─────────────────────────────────────────────────

export default function FindProviderPage() {
  const params = useParams<{ code: string }>();
  const [personaCode] = usePersona("members");
  const code = params.code || personaCode;

  // Filters
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [insurerToggle, setInsurerToggle] = useState(true);
  const [sortBy, setSortBy] = useState<"rating" | "wait">("rating");

  // Sheet state
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: memberData, isLoading: memberLoading } =
    useQuery<MemberResponse>({
      queryKey: ["/api/members/portal/member", code],
      queryFn: () =>
        fetch(`/api/members/portal/member/${code}`).then((r) => r.json()),
      enabled: !!code,
    });

  const member = memberData?.member;

  // Set city default from member when available
  const effectiveCity = cityFilter || member?.city || "";

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (specialtyFilter) params.set("specialty", specialtyFilter);
    if (effectiveCity) params.set("city", effectiveCity);
    if (insurerToggle && member?.insurerName)
      params.set("insurer", member.insurerName);
    params.set("sortBy", sortBy);
    return params.toString();
  }, [specialtyFilter, effectiveCity, insurerToggle, member?.insurerName, sortBy]);

  const { data: providersData, isLoading: providersLoading } =
    useQuery<ProvidersResponse>({
      queryKey: ["/api/members/portal/providers", queryParams],
      queryFn: () =>
        fetch(`/api/members/portal/providers?${queryParams}`).then((r) =>
          r.json()
        ),
      enabled: !!code,
    });

  const providers = providersData?.data ?? [];

  const handleProviderClick = (provider: Provider) => {
    setSelectedProvider(provider);
    setSheetOpen(true);
  };

  if (!code) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No member code provided.
      </div>
    );
  }

  if (memberLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Member not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Condensed Member Header */}
      <div className="flex items-center gap-3 p-4 rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-50 text-purple-600 shrink-0">
          <User className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-semibold">{member.name}</h1>
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
          >
            {member.planTier}
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Specialty */}
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Specialty
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. Cardiology, Dermatology..."
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* City */}
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                City
              </label>
              <Input
                placeholder={member.city || "City"}
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
            </div>

            {/* Insurance Toggle */}
            <div className="flex items-center gap-2 pb-1">
              <Checkbox
                id="insurer-toggle"
                checked={insurerToggle}
                onCheckedChange={(checked) =>
                  setInsurerToggle(checked === true)
                }
              />
              <label
                htmlFor="insurer-toggle"
                className="text-sm font-medium cursor-pointer"
              >
                Accepts my insurance
              </label>
            </div>

            {/* Sort By */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Sort by
              </label>
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as "rating" | "wait")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="wait">Wait Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {providersLoading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          Loading providers...
        </div>
      ) : providers.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          No providers found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <Card
              key={provider.code}
              className="shadow-sm cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-300"
              onClick={() => handleProviderClick(provider)}
            >
              <CardContent className="p-4 space-y-3">
                {/* Name + Type */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      {provider.name}
                    </p>
                    {provider.nameAr && (
                      <p
                        className="text-xs text-muted-foreground"
                        dir="rtl"
                      >
                        {provider.nameAr}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {provider.type}
                  </Badge>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-sm tracking-wide">
                    {renderStars(Number(provider.rating))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Number(provider.rating).toFixed(1)} ({provider.reviewCount}{" "}
                    reviews)
                  </span>
                </div>

                {/* Wait Time */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{provider.waitTimeMinutes} min wait</span>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1">
                  {provider.specialties.slice(0, 3).map((spec) => (
                    <Badge
                      key={spec}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {spec}
                    </Badge>
                  ))}
                  {provider.specialties.length > 3 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      +{provider.specialties.length - 3} more
                    </Badge>
                  )}
                </div>

                {/* Languages */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  {provider.languages.join(", ")}
                </div>

                {/* Working Hours */}
                <p className="text-xs text-muted-foreground">
                  {provider.workingHours}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Provider Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          {selectedProvider && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">
                  {selectedProvider.name}
                </SheetTitle>
                <SheetDescription>
                  {selectedProvider.nameAr && (
                    <span dir="rtl">{selectedProvider.nameAr}</span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Type + Rating */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {selectedProvider.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-amber-500 text-sm">
                      {renderStars(Number(selectedProvider.rating))}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Number(selectedProvider.rating).toFixed(1)} (
                      {selectedProvider.reviewCount} reviews)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedProvider.waitTimeMinutes} min average wait
                    </span>
                  </div>
                </div>

                {/* Covered Badge */}
                {selectedProvider.acceptedInsurers?.includes(
                  member.insurerName
                ) && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      Covered under your plan
                    </span>
                  </div>
                )}

                {/* Contact */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Contact</h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{selectedProvider.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{selectedProvider.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {selectedProvider.address}
                        {selectedProvider.city && `, ${selectedProvider.city}`}
                        {selectedProvider.region &&
                          ` (${selectedProvider.region})`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* All Specialties */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Specialties</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProvider.specialties.map((spec) => (
                      <Badge
                        key={spec}
                        variant="secondary"
                        className="text-xs"
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Languages</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProvider.languages.map((lang) => (
                      <Badge key={lang} variant="outline" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Working Hours */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Working Hours</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProvider.workingHours}
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
