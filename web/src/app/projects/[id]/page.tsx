"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { Modal } from "@/components/Modal";

/* ─── Dummy AI summaries ─── */

type AiSummary = {
  keyThemes: string[];
  methodology: string;
  findings: string;
  recommendations: string;
};

const RESEARCH_PLAN_SUMMARIES: AiSummary[] = [
  {
    keyThemes: ["User onboarding friction", "Navigation discoverability", "Mobile responsiveness"],
    methodology: "Mixed-methods study combining 12 moderated usability sessions with a 200-participant survey panel. Participants were recruited from the existing user base across three tenure cohorts.",
    findings: "First-time users struggled to locate core features within the first session. 68% of mobile users reported difficulty completing key tasks on smaller screens. Navigation labels were misinterpreted by 4 in 10 participants.",
    recommendations: "Redesign the onboarding checklist to surface the three highest-value actions. Conduct a labelling audit and A/B test alternative navigation copy. Prioritise responsive layout improvements for screens under 390px.",
  },
  {
    keyThemes: ["Search relevance", "Filter usability", "Result presentation"],
    methodology: "Diary study over 14 days with 18 frequent searchers, supplemented by server-side query-log analysis covering 50,000 sessions.",
    findings: "Users regularly reformulate queries three or more times before finding results. Filter panels are ignored by 55% of users despite high task relevance. Keyword matches outperform semantic ranking in perceived accuracy.",
    recommendations: "Introduce query suggestion prompts after the second failed search. Collapse filter panels by default and use progressive disclosure. Evaluate a hybrid retrieval model combining BM25 with embedding similarity.",
  },
  {
    keyThemes: ["Notification overload", "Preference management", "Engagement retention"],
    methodology: "In-app intercept survey (n=1,400) paired with six in-depth interviews and longitudinal engagement analysis over 90 days.",
    findings: "44% of users disabled all notifications within 30 days of sign-up. Preference screens were found 'too complex' by 7 of 6 interview participants. Notification volume correlated negatively with 90-day retention.",
    recommendations: "Implement a smart digest mode that batches low-priority alerts. Simplify the preference UI to a three-tier system. Run a holdout experiment to quantify the retention impact of reduced notification cadence.",
  },
  {
    keyThemes: ["Checkout abandonment", "Trust signals", "Payment friction"],
    methodology: "Funnel analysis across 180,000 checkout sessions combined with exit-intent intercept surveys (n=620) and five contextual interviews with recent abandoners.",
    findings: "Cart abandonment peaks at the payment step (62%). Users cite uncertainty about data security as the top reason for leaving. Guest checkout completion rates are 34% higher than account-required flows.",
    recommendations: "Add security badges and a plain-language privacy statement to the payment screen. Default new visitors to a guest flow with optional account creation post-purchase. Reduce form fields from 11 to 6.",
  },
  {
    keyThemes: ["Collaborative editing", "Conflict resolution", "Real-time feedback"],
    methodology: "Controlled lab study with 24 two-person teams performing shared editing tasks, followed by a 30-day field deployment with usage telemetry.",
    findings: "Teams experienced version conflicts in 38% of sessions when three or more collaborators edited simultaneously. Visual latency indicators were not noticed by 70% of participants. Cursor presence reduced conflict rate by 22%.",
    recommendations: "Surface conflict warnings inline rather than in a modal dialog. Make latency indicators larger and position them adjacent to the affected content block. Extend presence indicators to show the section each collaborator is viewing.",
  },
  {
    keyThemes: ["Accessibility compliance", "Screen reader compatibility", "Colour contrast"],
    methodology: "WCAG 2.1 AA audit across 34 core screens using automated tooling, supplemented by manual testing with four assistive-technology users.",
    findings: "17 critical violations identified, predominantly missing ARIA labels and insufficient colour contrast ratios. Screen reader users required 2.4× more time to complete key tasks. Focus order was illogical on 9 of 34 screens.",
    recommendations: "Address all critical violations before the next release cycle. Establish an accessibility regression checklist for the QA pipeline. Schedule quarterly reviews with assistive-technology user panels.",
  },
  {
    keyThemes: ["Dashboard comprehension", "Data visualisation", "Decision-making support"],
    methodology: "Eye-tracking study with 16 data analysts, followed by think-aloud walkthroughs and a retrospective questionnaire.",
    findings: "Participants fixated on chart titles rather than data points, suggesting low interpretive confidence. 50% could not correctly answer a key metric question after 60 seconds of exposure. Colour-coding was inconsistent across chart types.",
    recommendations: "Add interpretive annotations to primary KPI charts. Standardise the colour palette across all visualisation components. Introduce a 'key insight' callout section at the top of each dashboard.",
  },
  {
    keyThemes: ["Feature adoption", "Empty states", "Progressive disclosure"],
    methodology: "Cohort analysis of 8,000 accounts over six months, segmented by plan tier, combined with 10 user interviews focusing on underused features.",
    findings: "Advanced features had a median adoption rate of 11% among eligible users. Empty state screens provided no actionable next step for 60% of features. Power users discovered features primarily through peer word-of-mouth.",
    recommendations: "Redesign empty states with a single, contextual CTA linked to a two-minute guided tour. Add a 'What's new' digest to the product newsletter. Introduce an in-app achievement system to surface adjacent features.",
  },
  {
    keyThemes: ["Error recovery", "Error message clarity", "Support escalation"],
    methodology: "Support ticket analysis (n=2,200 tickets) cross-referenced with session recordings of 350 error-encounter sessions.",
    findings: "Generic error messages account for 48% of support contacts. Users attempt the same failing action an average of 3.1 times before seeking help. Clear, actionable error messages reduced support escalation by 31% in a prior A/B test.",
    recommendations: "Audit all error strings and replace generic codes with plain-language guidance. Add 'Try these steps' expandable sections to the top 10 most common errors. Instrument error frequency by type in the analytics dashboard.",
  },
  {
    keyThemes: ["Personalisation effectiveness", "Recommendation relevance", "User control"],
    methodology: "Online experiment with 12,000 users randomised into four personalisation conditions, combined with qualitative follow-up interviews (n=14).",
    findings: "Personalised recommendations increased click-through by 27% but reduced perceived user control. Interview participants expressed discomfort when recommendations felt 'too accurate'. Opt-out rates increased as personalisation intensity increased.",
    recommendations: "Adopt a light-touch personalisation approach, making the logic visible and editable by users. Provide a 'Why am I seeing this?' explanation for each recommendation. Cap personalisation intensity at the median confidence percentile.",
  },
  {
    keyThemes: ["Pricing comprehension", "Plan comparison", "Upgrade motivation"],
    methodology: "Unmoderated remote usability tests (n=80) on the pricing page, plus analysis of 6,000 upgrade funnel sessions.",
    findings: "Users spent an average of 22 seconds on the pricing page before leaving. Feature comparison tables were scrolled past by 65% of visitors. The 'Most popular' label increased upgrade clicks by 18% in a previous experiment.",
    recommendations: "Reduce the pricing page to three plan tiers maximum. Lead with benefit statements rather than feature lists. Test a conversational pricing guide that asks users about their needs before surfacing a recommendation.",
  },
];

const PROJECT_REPORT_SUMMARIES: AiSummary[] = [
  {
    keyThemes: ["Task completion rates", "Time-on-task benchmarks", "Critical path efficiency"],
    methodology: "Summative usability evaluation with 20 representative end-users across five core task scenarios. Sessions were screen-recorded and coded by two independent analysts.",
    findings: "Overall task completion reached 84%, exceeding the 80% target. Mean time-on-task for the primary workflow decreased 19% versus the previous quarter. Three tasks remain below threshold and require further design iteration.",
    recommendations: "Prioritise the three below-threshold tasks in the next sprint. Establish a monthly usability benchmark cadence to track regression. Share findings with engineering leads to align on implementation trade-offs.",
  },
  {
    keyThemes: ["Net Promoter Score trends", "Satisfaction drivers", "Verbatim sentiment"],
    methodology: "Quarterly NPS survey distributed to 4,200 active users with a 31% response rate, combined with automated sentiment analysis of 890 verbatim responses.",
    findings: "NPS increased from 32 to 41 quarter-over-quarter, driven primarily by improvements in load speed and notification controls. Detractor comments cluster around billing transparency and customer support response time.",
    recommendations: "Address billing-related detractor themes in the next roadmap cycle. Share the support-response-time finding with the CX team for SLA review. Continue monitoring load speed following the infrastructure migration.",
  },
  {
    keyThemes: ["Competitive differentiation", "Feature parity gaps", "Positioning opportunities"],
    methodology: "Heuristic evaluation of five competing products against a 48-point rubric, supplemented by analysis of 1,200 competitor reviews on G2 and Capterra.",
    findings: "The product leads competitors on collaboration features and data export flexibility. Gaps exist in mobile experience depth and API documentation quality. Competitor review sentiment highlights AI-assisted workflows as a rising expectation.",
    recommendations: "Accelerate the mobile roadmap to close the parity gap within two quarters. Invest in API documentation and developer experience to protect enterprise retention. Prototype an AI-assisted workflow feature for roadmap consideration.",
  },
  {
    keyThemes: ["Onboarding completion", "Time-to-value", "Activation milestones"],
    methodology: "Funnel analysis of 3,800 new accounts across a 60-day cohort window, supplemented by 8 interviews with recently activated and churned users.",
    findings: "Only 38% of new accounts complete the onboarding checklist. Median time-to-first-key-action is 4.2 days, versus a benchmark of 1.5 days. Accounts that complete onboarding within 48 hours show 2.3× higher 90-day retention.",
    recommendations: "Reduce the onboarding checklist to five essential steps focused on the highest-value actions. Introduce a personalised onboarding path based on stated use case at sign-up. Trigger a proactive check-in message at day 3 for accounts that have not yet activated.",
  },
  {
    keyThemes: ["Feature utilisation depth", "Power-user behaviour", "Churn risk signals"],
    methodology: "Cluster analysis of behavioural telemetry from 14,000 active accounts, segmented into five engagement personas based on feature usage patterns.",
    findings: "Power users (12% of accounts) generate 58% of total feature interactions. The 'passive consumer' cluster shows the highest 6-month churn risk at 34%. Three features with high discovery barriers are underutilised despite strong correlation with retention.",
    recommendations: "Design targeted in-app nudges to migrate passive consumers toward higher-engagement behaviours. Remove discovery barriers for the three high-retention features via UI surfacing changes. Develop a power-user referral programme to leverage their advocacy.",
  },
  {
    keyThemes: ["Information architecture", "Content findability", "Navigation depth"],
    methodology: "Card sorting (n=45) and tree testing (n=120) exercises conducted remotely, followed by a first-click study across 10 representative tasks.",
    findings: "First-click accuracy averaged 61% against a 75% target. Users consistently grouped settings-related content differently from the current IA. Three navigation nodes had success rates below 40%.",
    recommendations: "Restructure the settings section to reflect the user mental model identified in card sorting. Flatten the navigation hierarchy for the three underperforming nodes. Validate the proposed IA with a follow-up tree test before development begins.",
  },
  {
    keyThemes: ["Cross-device continuity", "Session handoff", "State persistence"],
    methodology: "Field study observing 22 participants using the product across desktop and mobile devices over two weeks, with pre/post surveys on continuity expectations.",
    findings: "16 of 22 participants expected in-progress work to sync automatically across devices. State loss on session handoff caused frustration in 9 of 22 cases. Users on mobile were more likely to abandon tasks than resume them later.",
    recommendations: "Implement automatic draft-state persistence across sessions. Add a 'Continue on mobile' quick-access entry point on the desktop home screen. Prioritise session continuity as a P1 requirement in the next infrastructure review.",
  },
  {
    keyThemes: ["Form completion rates", "Field-level drop-off", "Validation UX"],
    methodology: "Field-level analytics across 28,000 form submissions combined with session recordings of 200 incomplete form sessions.",
    findings: "The longest form (11 fields) has a 44% abandonment rate. Drop-off is highest at fields requesting optional information presented as mandatory. Inline validation errors reduced re-submission attempts by 26% in the current design.",
    recommendations: "Audit all forms to remove or defer optional fields. Update field labels and helper text to clearly distinguish required from optional inputs. Extend inline validation to the four forms currently showing post-submission errors only.",
  },
  {
    keyThemes: ["Help content consumption", "Self-serve resolution rate", "Support deflection"],
    methodology: "Analysis of 9,400 help centre sessions cross-referenced with support ticket creation within 24 hours, plus usability testing of 5 top-viewed articles.",
    findings: "Self-serve resolution rate stands at 53%, below the industry benchmark of 70%. Users exit help articles to raise tickets within 3 minutes in 41% of sessions. Article readability scores average Grade 14, well above the recommended Grade 8.",
    recommendations: "Rewrite the 20 highest-traffic help articles to a Grade 8 reading level. Embed short video walkthroughs in the top 5 procedural articles. Add a 'Did this answer your question?' prompt to measure article effectiveness per-page.",
  },
  {
    keyThemes: ["Prototype validation", "Concept desirability", "Risk identification"],
    methodology: "Concept testing with 30 participants using mid-fidelity prototypes across three design directions, scored on desirability, usability, and credibility dimensions.",
    findings: "Direction B scored highest on desirability (4.2/5) and usability (3.9/5). Participants raised concerns about data privacy in Direction A that were not present in the other concepts. Direction C was seen as visually distinct but conceptually unclear.",
    recommendations: "Proceed to high-fidelity development with Direction B as the primary concept. Address the privacy concerns identified in Direction A by adding explicit consent language to Direction B. Retire Direction C and document learnings for future explorations.",
  },
  {
    keyThemes: ["Localisation quality", "Cultural appropriateness", "Regional UX variation"],
    methodology: "Localisation review across 6 markets with native-speaker evaluators assessing 3,200 strings, combined with regional usability sessions (n=8 per market).",
    findings: "Date and number formatting errors were present in 3 of 6 markets. Two markets flagged culturally inappropriate iconography in the notification system. Task completion rates varied by up to 18 percentage points across markets.",
    recommendations: "Implement locale-aware date and number formatting in the internationalisation layer. Replace the flagged icons with market-neutral alternatives. Conduct dedicated usability testing in the two lowest-performing markets before the next release.",
  },
];

function pickSummary(pool: AiSummary[], seed: string): AiSummary {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}

/* ─── AI Processing Overlay ─── */

function AiProcessingOverlay({ visible }: { visible: boolean }) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-12 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <svg
          className="absolute inset-0 h-14 w-14 animate-spin text-indigo-400"
          viewBox="0 0 56 56"
          fill="none"
        >
          <circle
            cx="28"
            cy="28"
            r="24"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray="80 72"
            strokeLinecap="round"
          />
        </svg>
        <svg
          className="h-6 w-6 text-indigo-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-indigo-700">
          AI is processing your report{dots}
        </p>
        <p className="mt-1 text-xs text-indigo-500">
          Analysing content and generating summary
        </p>
      </div>
    </div>
  );
}

/* ─── Structured AI Summary ─── */

function AiSummaryBlock({ summary }: { summary: AiSummary }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-slate-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <svg
          className="h-4 w-4 text-indigo-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          AI Summary
        </span>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          Draft · Pending review
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Key Themes
          </h5>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {summary.keyThemes.map((t) => (
              <span
                key={t}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Methodology
          </h5>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            {summary.methodology}
          </p>
        </div>

        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Key Findings
          </h5>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            {summary.findings}
          </p>
        </div>

        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recommendations
          </h5>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            {summary.recommendations}
          </p>
        </div>
      </div>
    </div>
  );
}

type ProductAreaOption = {
  id: string;
  name: string;
};

type ProjectDetails = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  productAreaId: string;
  productArea?: { id: string; name: string };
  researchPlan?: {
    id: string;
    updatedAt: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    lastEditedBy?: {
      id: string;
      name: string;
      email: string;
    };
  } | null;
  _count?: {
    insights: number;
  };
};

type Report = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  fileName: string;
  fileUrl: string;
  notes: string | null;
  createdAt: string;
};

type ResearcherOption = {
  id: string;
  name: string;
  email: string;
};

type Tab = "overview" | "research-plan" | "report";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "research-plan", label: "Research Plan" },
  { key: "report", label: "Project Report" },
];

/* ─── Shared file-upload UI for Research Plan & Report tabs ─── */

function FileUploadZone({
  label,
  accept,
  guidance,
  onFileSelected,
  isUploading,
}: {
  label: string;
  accept: string;
  guidance: string;
  onFileSelected: (file: File) => void;
  isUploading: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition ${
        isDragOver
          ? "border-indigo-400 bg-indigo-50"
          : "border-slate-300 bg-slate-50"
      }`}
    >
      <svg
        className="h-10 w-10 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
        />
      </svg>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">{guidance}</p>

      <label className="mt-2 cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
        {isUploading ? "Uploading..." : "Choose File"}
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
      </label>
    </div>
  );
}

function FileListing({
  fileName,
  fileSize,
  uploadedAt,
  aiSummary,
  fileUrl,
  onRemove,
}: {
  fileName: string;
  fileSize?: number | null;
  uploadedAt: string;
  aiSummary?: AiSummary | null;
  fileUrl?: string | null;
  onRemove?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <svg
            className="h-5 w-5 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{fileName}</p>
          <p className="text-xs text-slate-500">
            {fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : ""}{" "}
            {fileSize ? "·" : ""} Uploaded {new Date(uploadedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Open
            </a>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {aiSummary && <AiSummaryBlock summary={aiSummary} />}
    </div>
  );
}

/* ─── Main page ─── */

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [item, setItem] = useState<ProjectDetails | null>(null);
  const [productAreas, setProductAreas] = useState<ProductAreaOption[]>([]);

  // Edit form state
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productAreaId, setProductAreaId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [reports, setReports] = useState<Report[]>([]);
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);

  // Report upload
  const [reportTitle, setReportTitle] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportFileUrl, setReportFileUrl] = useState("");
  const [reportFileName, setReportFileName] = useState("");
  const [reportFileSize, setReportFileSize] = useState("");
  const [reportCreatedById, setReportCreatedById] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [showAddReport, setShowAddReport] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isUploadingResearchPlan, setIsUploadingResearchPlan] = useState(false);
  const [isAiProcessingResearchPlan, setIsAiProcessingResearchPlan] = useState(false);
  const [isAiProcessingReport, setIsAiProcessingReport] = useState(false);
  const [researchPlanFileUrl, setResearchPlanFileUrl] = useState<string | null>(null);
  const [researchPlanFileName, setResearchPlanFileName] = useState<string | null>(null);
  const [researchPlanFileSize, setResearchPlanFileSize] = useState<number | null>(null);
  const researchPlanSummaryRef = useRef<AiSummary | null>(null);
  const reportSummariesRef = useRef<Map<string, AiSummary>>(new Map());

  // For demo purposes we treat the user as having edit access
  const hasEditAccess = true;

  async function uploadFile(file: File): Promise<{ fileName: string; storedName: string; fileSize: number; url: string } | null> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as { data?: { fileName: string; storedName: string; fileSize: number; url: string }; error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? "File upload failed");
    }

    return result.data ?? null;
  }

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [projectResponse, areasResponse, reportsResponse, researchersResponse] = await Promise.all([
        fetch(`/api/projects/${id}`, { cache: "no-store" }),
        fetch("/api/product-areas", { cache: "no-store" }),
        fetch(`/api/reports?projectId=${id}`, { cache: "no-store" }),
        fetch("/api/researchers", { cache: "no-store" }),
      ]);

      const projectData = (await projectResponse.json()) as { data?: ProjectDetails; error?: string };
      const areasData = (await areasResponse.json()) as { data?: ProductAreaOption[]; error?: string };
      const reportsData = (await reportsResponse.json()) as { data?: Report[]; error?: string };
      const researchersData = (await researchersResponse.json()) as { data?: ResearcherOption[]; error?: string };

      if (!projectResponse.ok) {
        throw new Error(projectData.error ?? "Could not load Project");
      }

      if (!areasResponse.ok) {
        throw new Error(areasData.error ?? "Could not load Product Areas");
      }

      const loaded = projectData.data;

      if (!loaded) {
        throw new Error("Project not found");
      }

      setItem(loaded);
      setProductAreas(areasData.data ?? []);
      setReports(reportsData.data ?? []);

      const researchersList = researchersData.data ?? [];
      setResearchers(researchersList);
      if (researchersList.length > 0) {
        setReportCreatedById((current) => current || researchersList[0].id);
      }

      setName(loaded.name);
      setDescription(loaded.description ?? "");
      setProductAreaId(loaded.productAreaId);
      setStartDate(loaded.startDate ? loaded.startDate.slice(0, 10) : "");
      setEndDate(loaded.endDate ? loaded.endDate.slice(0, 10) : "");

      // Restore research plan file state from API data
      if (loaded.researchPlan?.fileUrl) {
        setResearchPlanFileUrl(loaded.researchPlan.fileUrl);
        setResearchPlanFileName(loaded.researchPlan.fileName ?? null);
        setResearchPlanFileSize(loaded.researchPlan.fileSize ?? null);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  function openEditModal() {
    if (!item) return;
    setName(item.name);
    setDescription(item.description ?? "");
    setProductAreaId(item.productAreaId);
    setStartDate(item.startDate ? item.startDate.slice(0, 10) : "");
    setEndDate(item.endDate ? item.endDate.slice(0, 10) : "");
    setEditOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          productAreaId,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update Project");
      }

      setEditOpen(false);
      await loadData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this Project? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete Project");
      }

      router.push("/projects");
      router.refresh();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAddReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingReport(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle.trim(),
          notes: reportNotes.trim() ? reportNotes.trim() : null,
          fileUrl: reportFileUrl.trim(),
          fileName: reportFileName.trim(),
          fileSize: reportFileSize ? Number(reportFileSize) : null,
          projectId: id,
          createdById: reportCreatedById,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not add Report");
      }

      setReportTitle("");
      setReportNotes("");
      setReportFileUrl("");
      setReportFileName("");
      setReportFileSize("");
      setShowAddReport(false);

      const reportsResponse = await fetch(`/api/reports?projectId=${id}`, { cache: "no-store" });
      const reportsData = (await reportsResponse.json()) as { data?: Report[] };
      setReports(reportsData.data ?? []);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsSavingReport(false);
    }
  }

  async function handleResearchPlanFile(file: File) {
    setIsUploadingResearchPlan(true);
    setIsAiProcessingResearchPlan(true);
    setError(null);
    try {
      const uploaded = await uploadFile(file);
      if (!uploaded) throw new Error("Upload returned no data");

      setResearchPlanFileUrl(uploaded.url);
      setResearchPlanFileName(uploaded.fileName);
      setResearchPlanFileSize(uploaded.fileSize);

      // Also create/update the research plan record so the "filled" state shows
      const firstResearcher = researchers[0];
      if (firstResearcher) {
        const resp = await fetch(`/api/research-plans/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: {
              type: "doc",
              content: [{ type: "paragraph", content: [{ type: "text", text: `Uploaded file: ${uploaded.fileName}` }] }],
            },
            researcherId: firstResearcher.id,
            fileUrl: uploaded.url,
            fileName: uploaded.fileName,
            fileSize: uploaded.fileSize,
          }),
        });

        if (!resp.ok) {
          const errData = (await resp.json()) as { error?: string };
          throw new Error(errData.error ?? "Could not save research plan");
        }
      } else {
        throw new Error("No researcher available. Please create a researcher first.");
      }

      // Pick and lock in the dummy summary for this upload
      researchPlanSummaryRef.current = pickSummary(RESEARCH_PLAN_SUMMARIES, uploaded.url);

      // 5-second AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 5000));

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setIsUploadingResearchPlan(false);
      setIsAiProcessingResearchPlan(false);
    }
  }

  async function handleReportFile(file: File) {
    setError(null);
    setIsSavingReport(true);
    setIsAiProcessingReport(true);
    try {
      const uploaded = await uploadFile(file);
      if (!uploaded) throw new Error("Upload returned no data");

      setReportFileName(uploaded.fileName);
      setReportFileSize(String(uploaded.fileSize));
      setReportFileUrl(uploaded.url);
      setReportTitle(uploaded.fileName.replace(/\.[^.]+$/, ""));

      // Pick and lock in the dummy summary for this upload
      reportSummariesRef.current.set(uploaded.url, pickSummary(PROJECT_REPORT_SUMMARIES, uploaded.url));

      // 5-second AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 5000));

      setShowAddReport(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setIsSavingReport(false);
      setIsAiProcessingReport(false);
    }
  }

  /* ── Helpers ── */

  const productAreaName =
    item?.productArea?.name ??
    productAreas.find((a) => a.id === item?.productAreaId)?.name ??
    "—";

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—";

  /* ── Render ── */

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <Link
              href="/projects"
              className="text-xs font-medium text-slate-500 hover:text-indigo-600"
            >
              &larr; Back to Projects
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {item?.name ?? "Project Details"}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || !item}
            className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete Project"}
          </button>
        </header>

        {/* Error banner */}
        {error && (
          <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </section>
        )}

        {isLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading Project...</p>
          </section>
        ) : item ? (
          <>
            {/* Tabs */}
            <nav className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.key
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* ━━━ Overview Tab ━━━ */}
            {activeTab === "overview" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Project Overview</h2>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                </div>

                <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </dt>
                    <dd className="mt-1 text-sm text-slate-900">{item.name}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Product Area
                    </dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {productAreaName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Start Date
                    </dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {formatDate(item.startDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      End Date
                    </dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {formatDate(item.endDate)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-900">
                      {item.description || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Insights
                    </dt>
                    <dd className="mt-1 text-sm text-slate-900">
                      {item._count?.insights ?? 0} insight
                      {(item._count?.insights ?? 0) !== 1 ? "s" : ""}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* ━━━ Research Plan Tab ━━━ */}
            {activeTab === "research-plan" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Research Plan</h2>

                {isAiProcessingResearchPlan ? (
                  <div className="mt-4">
                    <AiProcessingOverlay visible />
                  </div>
                ) : item.researchPlan ? (
                  /* Filled state */
                  <div className="mt-4 flex flex-col gap-4">
                    <FileListing
                      fileName={researchPlanFileName ?? item.researchPlan.fileName ?? "Research Plan"}
                      fileSize={researchPlanFileSize ?? item.researchPlan.fileSize}
                      uploadedAt={item.researchPlan.updatedAt}
                      fileUrl={researchPlanFileUrl ?? item.researchPlan.fileUrl}
                      aiSummary={researchPlanSummaryRef.current ?? pickSummary(RESEARCH_PLAN_SUMMARIES, item.researchPlan.id)}
                    />
                    <Link
                      href={`/projects/${id}/research-plan`}
                      className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Open Research Plan Editor
                    </Link>
                  </div>
                ) : hasEditAccess ? (
                  /* Empty state — with edit access */
                  <div className="mt-4">
                    <FileUploadZone
                      label="Upload your Research Plan"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      guidance="Drag & drop or click to upload. Accepted formats: PDF, DOC, DOCX, TXT, MD."
                      onFileSelected={handleResearchPlanFile}
                      isUploading={isUploadingResearchPlan}
                    />
                    <div className="mt-3 text-center">
                      <span className="text-xs text-slate-400">or</span>
                      <Link
                        href={`/projects/${id}/research-plan`}
                        className="ml-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Create in the editor
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Empty state — no edit access */
                  <div className="mt-6 flex flex-col items-center gap-2 py-10 text-center">
                    <svg
                      className="h-12 w-12 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-slate-500">
                      No Research Plan Uploaded
                    </p>
                    <p className="text-xs text-slate-400">
                      A project admin can upload a research plan.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* ━━━ Project Report Tab ━━━ */}
            {activeTab === "report" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Project Report</h2>

                {isAiProcessingReport ? (
                  <div className="mt-4">
                    <AiProcessingOverlay visible />
                  </div>
                ) : reports.length > 0 ? (
                  /* Filled state */
                  <div className="mt-4 flex flex-col gap-4">
                    {reports.map((report) => (
                      <FileListing
                        key={report.id}
                        fileName={report.fileName}
                        fileUrl={report.fileUrl}
                        uploadedAt={report.createdAt}
                        aiSummary={reportSummariesRef.current.get(report.fileUrl ?? "") ?? pickSummary(PROJECT_REPORT_SUMMARIES, report.id)}
                      />
                    ))}
                  </div>
                ) : hasEditAccess ? (
                  /* Empty state — with edit access */
                  <div className="mt-4">
                    <FileUploadZone
                      label="Upload a Project Report"
                      accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx"
                      guidance="Drag & drop or click to upload. Accepted formats: PDF, DOC, DOCX, TXT, MD, CSV, XLSX."
                      onFileSelected={handleReportFile}
                      isUploading={isSavingReport}
                    />
                  </div>
                ) : (
                  /* Empty state — no edit access */
                  <div className="mt-6 flex flex-col items-center gap-2 py-10 text-center">
                    <svg
                      className="h-12 w-12 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-slate-500">
                      No Project Report Uploaded
                    </p>
                    <p className="text-xs text-slate-400">
                      A project admin can upload a report.
                    </p>
                  </div>
                )}

                {/* Add-report form (shown after file picker fills fields) */}
                {showAddReport && (
                  <form
                    onSubmit={handleAddReport}
                    className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
                  >
                    <label className="flex flex-col gap-1 text-sm text-slate-700">
                      Title
                      <input
                        required
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-slate-700">
                      Uploaded By
                      <select
                        required
                        value={reportCreatedById}
                        onChange={(e) => setReportCreatedById(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500"
                      >
                        {researchers.length === 0 ? (
                          <option value="">No researchers — add one first</option>
                        ) : (
                          researchers.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))
                        )}
                      </select>
                    </label>

                    <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-700">
                      Notes
                      <textarea
                        value={reportNotes}
                        onChange={(e) => setReportNotes(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500"
                      />
                    </label>

                    <div className="md:col-span-2 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={isSavingReport || researchers.length === 0}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {isSavingReport ? "Saving..." : "Save Report"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddReport(false)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

            {/* ━━━ Edit Modal ━━━ */}
            <Modal
              isOpen={editOpen}
              onClose={() => setEditOpen(false)}
              title="Edit Project"
            >
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Product Area
                  <select
                    value={productAreaId}
                    onChange={(e) => setProductAreaId(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  >
                    {productAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    Start Date
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    End Date
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Description
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </label>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Modal>
          </>
        ) : null}
      </div>
    </main>
  );
}
