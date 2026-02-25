import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

type PreAuthRecommendation = "APPROVE" | "REJECT" | "PEND_REVIEW" | "REQUEST_INFO";

interface PreAuthAdjudicatorPanelProps {
  decision: {
    topRecommendation?: PreAuthRecommendation | null;
    aggregatedScore?: string | number | null;
    hasHardStop?: boolean | null;
  };
  onAction: (action: {
    action: "accept" | "override";
    finalVerdict: PreAuthRecommendation;
    overrideReason?: string;
    overrideCategory?: string;
  }) => void;
  isSubmitting?: boolean;
  className?: string;
}

const overrideCategories = [
  { value: "clinical_judgment", label: "Clinical Judgment Override" },
  { value: "documentation_review", label: "Additional Documentation Reviewed" },
  { value: "policy_exception", label: "Policy Exception" },
  { value: "member_appeal", label: "Member Appeal" },
  { value: "provider_clarification", label: "Provider Clarification" },
  { value: "other", label: "Other" },
];

export function PreAuthAdjudicatorPanel({ 
  decision, 
  onAction, 
  isSubmitting, 
  className 
}: PreAuthAdjudicatorPanelProps) {
  const [mode, setMode] = useState<"review" | "override">("review");
  const [overrideVerdict, setOverrideVerdict] = useState<PreAuthRecommendation>("APPROVE");
  const [overrideCategory, setOverrideCategory] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");

  const topRecommendation = decision.topRecommendation;

  const handleAccept = () => {
    if (!topRecommendation) return;
    onAction({
      action: "accept",
      finalVerdict: topRecommendation,
    });
  };

  const handleOverride = () => {
    if (!overrideCategory || !overrideReason.trim()) return;
    onAction({
      action: "override",
      finalVerdict: overrideVerdict,
      overrideReason,
      overrideCategory,
    });
  };

  const canSubmitOverride = overrideCategory && overrideReason.trim().length > 10;

  return (
    <Card className={cn("", className)} data-testid="preauth-adjudicator-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Adjudicator Action
          </CardTitle>
          <Badge variant={mode === "review" ? "default" : "secondary"}>
            {mode === "review" ? "Review Mode" : "Override Mode"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {mode === "review" ? (
          <>
            <div className="p-4 rounded-md bg-muted/50 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium">System Recommendation</span>
                {topRecommendation && (
                  <Badge 
                    className={cn(
                      "gap-1.5",
                      topRecommendation === "APPROVE" && "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
                      topRecommendation === "REJECT" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
                      (topRecommendation === "PEND_REVIEW" || topRecommendation === "REQUEST_INFO") && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                    )}
                    data-testid="adjudicator-recommendation"
                  >
                    {topRecommendation === "APPROVE" && <CheckCircle className="w-3.5 h-3.5" />}
                    {topRecommendation === "REJECT" && <XCircle className="w-3.5 h-3.5" />}
                    {(topRecommendation === "PEND_REVIEW" || topRecommendation === "REQUEST_INFO") && <AlertCircle className="w-3.5 h-3.5" />}
                    {topRecommendation.replace("_", " ")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Review the signals and evidence above. Accept this recommendation or override with your judgment.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button 
                className="flex-1 gap-2 min-w-[140px]" 
                onClick={handleAccept}
                disabled={isSubmitting || !topRecommendation}
                data-testid="button-accept-recommendation"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsUp className="w-4 h-4" />
                )}
                Accept Recommendation
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2 min-w-[140px]"
                onClick={() => setMode("override")}
                disabled={isSubmitting}
                data-testid="button-override-mode"
              >
                <ThumbsDown className="w-4 h-4" />
                Override Decision
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Override Verdict</Label>
                <RadioGroup
                  value={overrideVerdict}
                  onValueChange={(v) => setOverrideVerdict(v as PreAuthRecommendation)}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="APPROVE" id="override-approve" />
                    <Label htmlFor="override-approve" className="cursor-pointer flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Approve
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="REJECT" id="override-reject" />
                    <Label htmlFor="override-reject" className="cursor-pointer flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Reject
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PEND_REVIEW" id="override-pend" />
                    <Label htmlFor="override-pend" className="cursor-pointer flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Pend Review
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="REQUEST_INFO" id="override-request" />
                    <Label htmlFor="override-request" className="cursor-pointer flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      Request Info
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="override-category">Override Category</Label>
                <Select value={overrideCategory} onValueChange={setOverrideCategory}>
                  <SelectTrigger id="override-category" data-testid="select-override-category">
                    <SelectValue placeholder="Select override reason category" />
                  </SelectTrigger>
                  <SelectContent>
                    {overrideCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="override-reason">Rationale (minimum 10 characters)</Label>
                <Textarea
                  id="override-reason"
                  placeholder="Provide detailed rationale for this override decision..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-override-reason"
                />
                <p className="text-xs text-muted-foreground">
                  {overrideReason.length} / 10 minimum characters
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {mode === "override" && (
        <CardFooter className="flex justify-between gap-3 flex-wrap">
          <Button 
            variant="ghost" 
            onClick={() => setMode("review")}
            disabled={isSubmitting}
            data-testid="button-back-to-review"
          >
            Back to Review
          </Button>
          <Button 
            onClick={handleOverride}
            disabled={!canSubmitOverride || isSubmitting}
            className="gap-2"
            data-testid="button-submit-override"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Override
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
