import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Sourced<T> {
  value: T;
  source: string;
}

interface UnifiedDay {
  date: string;
  steps: Sourced<number> | null;
  activeCalories: Sourced<number> | null;
  distanceMeters: Sourced<number> | null;
  exerciseMinutes: Sourced<number> | null;
  restingHeartRate: Sourced<number> | null;
  avgHeartRate: Sourced<number> | null;
  hrv: Sourced<number> | null;
  sleepDurationMinutes: Sourced<number> | null;
  sleepScore: Sourced<number> | null;
  sleepDeepMinutes: Sourced<number> | null;
  sleepREMMinutes: Sourced<number> | null;
  sleepLightMinutes: Sourced<number> | null;
  sleepAwakeMinutes: Sourced<number> | null;
  sleepEfficiency: Sourced<number> | null;
  respiratoryRate: Sourced<number> | null;
  oxygenSaturation: Sourced<number> | null;
  breathingDisturbanceIndex: Sourced<number> | null;
  readinessScore: Sourced<number> | null;
  temperatureDeviation: Sourced<number> | null;
  vo2Max: Sourced<number> | null;
  wristTemperature: Sourced<number> | null;
}

interface ReferenceRange {
  min?: number;
  max?: number;
  operator?: string;
  displayText: string;
}

interface LabResult {
  testName: string;
  standardizedName: string;
  value: number | string;
  unit: string;
  referenceRange: ReferenceRange;
  status: "normal" | "low" | "high" | "critical";
  category: string;
}

interface LabReport {
  date: string;
  results: LabResult[];
}

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const COLORS = {
  green: "#22c55e",
  orange: "#f97316",
  red: "#ef4444",
  darkGray: "#1f2937",
  medGray: "#4b5563",
  lightGray: "#9ca3af",
  veryLightGray: "#f3f4f6",
  white: "#ffffff",
  blue: "#3b82f6",
  darkBlue: "#1e3a5f",
  lightBlue: "#eff6ff",
  accent: "#6366f1",
} as const;

function statusColor(status: string): string {
  switch (status) {
    case "normal":
      return COLORS.green;
    case "low":
    case "high":
      return COLORS.orange;
    case "critical":
      return COLORS.red;
    default:
      return COLORS.medGray;
  }
}

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");

function loadLabResults(): LabReport[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data/lab_results.json"), "utf-8")
  );
  return raw.reports;
}

function loadDailyMetrics(): UnifiedDay[] {
  const raw = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data/unified/daily.json"), "utf-8")
  );
  return raw.data;
}

function loadStravaActivities(): StravaActivity[] {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "data/strava/activities.json"), "utf-8")
  );
}

// ---------------------------------------------------------------------------
// Stat Computation Helpers
// ---------------------------------------------------------------------------

function extractValues(
  days: UnifiedDay[],
  field: keyof UnifiedDay
): number[] {
  return days
    .map((d) => {
      const sourced = d[field] as Sourced<number> | null;
      return sourced?.value ?? null;
    })
    .filter((v): v is number => v !== null);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function filterDaysSince(days: UnifiedDay[], daysAgo: number): UnifiedDay[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return days.filter((d) => d.date >= cutoffStr);
}

function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return "N/A";
  const secondsPerKm = 1000 / metersPerSecond;
  const min = Math.floor(secondsPerKm / 60);
  const sec = Math.round(secondsPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ---------------------------------------------------------------------------
// Computed Statistics
// ---------------------------------------------------------------------------

interface MetricStat {
  label: string;
  value: string;
  status: "good" | "warning" | "bad";
  detail?: string;
}

interface RunningStats {
  totalKm: number;
  totalRuns: number;
  avgPace: string;
  avgDistanceKm: number;
  monthlyBreakdown: { month: string; km: number; runs: number }[];
}

function computeKeyMetrics(
  days: UnifiedDay[],
  labReports: LabReport[]
): MetricStat[] {
  const last90 = filterDaysSince(days, 90);
  const last30 = filterDaysSince(days, 30);

  const rhr = extractValues(last90, "restingHeartRate");
  const hrvValues = extractValues(last90, "hrv");
  const vo2Values = extractValues(days, "vo2Max");
  const stepsValues = extractValues(last30, "steps");
  const sleepValues = extractValues(last30, "sleepDurationMinutes");
  const spo2Values = extractValues(last30, "oxygenSaturation");

  const latestLab = labReports[0];
  const bmi = computeBMI();

  const metrics: MetricStat[] = [];

  if (rhr.length > 0) {
    const avgRhr = Math.round(avg(rhr));
    metrics.push({
      label: "Resting HR",
      value: `${avgRhr} bpm`,
      status: avgRhr < 60 ? "good" : avgRhr < 75 ? "warning" : "bad",
      detail: `90-day avg (range ${Math.round(Math.min(...rhr))}–${Math.round(Math.max(...rhr))})`,
    });
  }

  if (hrvValues.length > 0) {
    const avgHrv = Math.round(avg(hrvValues));
    metrics.push({
      label: "HRV",
      value: `${avgHrv} ms`,
      status: avgHrv > 50 ? "good" : avgHrv > 30 ? "warning" : "bad",
      detail: `90-day avg`,
    });
  }

  if (vo2Values.length > 0) {
    const latestVo2 = vo2Values[vo2Values.length - 1];
    metrics.push({
      label: "VO2 Max",
      value: `${latestVo2.toFixed(1)} mL/kg/min`,
      status: latestVo2 > 45 ? "good" : latestVo2 > 35 ? "warning" : "bad",
      detail: "Latest measurement",
    });
  }

  if (stepsValues.length > 0) {
    const avgSteps = Math.round(avg(stepsValues));
    metrics.push({
      label: "Avg Steps",
      value: avgSteps.toLocaleString(),
      status: avgSteps > 8000 ? "good" : avgSteps > 5000 ? "warning" : "bad",
      detail: "30-day avg",
    });
  }

  if (sleepValues.length > 0) {
    const avgSleep = avg(sleepValues);
    metrics.push({
      label: "Sleep",
      value: formatDuration(avgSleep),
      status:
        avgSleep >= 420 && avgSleep <= 540
          ? "good"
          : avgSleep >= 360
            ? "warning"
            : "bad",
      detail: "30-day avg duration",
    });
  }

  if (spo2Values.length > 0) {
    const avgSpo2 = avg(spo2Values).toFixed(1);
    metrics.push({
      label: "SpO2",
      value: `${avgSpo2}%`,
      status:
        parseFloat(avgSpo2) >= 95
          ? "good"
          : parseFloat(avgSpo2) >= 92
            ? "warning"
            : "bad",
      detail: "30-day avg",
    });
  }

  if (bmi !== null) {
    metrics.push({
      label: "BMI",
      value: bmi.toFixed(1),
      status:
        bmi >= 18.5 && bmi < 25
          ? "good"
          : bmi >= 25 && bmi < 30
            ? "warning"
            : "bad",
      detail: "Based on 70 kg / estimated height",
    });
  }

  // Blood pressure from Aleris (2023-11-28 report)
  const alerisReport = labReports.find((r) => r.date === "2023-11-28");
  if (alerisReport) {
    const systolic = alerisReport.results.find(
      (r) =>
        r.standardizedName === "systolic_bp" ||
        r.testName.toLowerCase().includes("systol")
    );
    const diastolic = alerisReport.results.find(
      (r) =>
        r.standardizedName === "diastolic_bp" ||
        r.testName.toLowerCase().includes("diastol")
    );
    if (systolic && diastolic) {
      const sVal =
        typeof systolic.value === "number" ? systolic.value : parseInt(String(systolic.value));
      const dVal =
        typeof diastolic.value === "number" ? diastolic.value : parseInt(String(diastolic.value));
      metrics.push({
        label: "Blood Pressure",
        value: `${sVal}/${dVal} mmHg`,
        status:
          sVal < 120 && dVal < 80
            ? "good"
            : sVal < 140 && dVal < 90
              ? "warning"
              : "bad",
        detail: "Aleris checkup 2023-11-28",
      });
    }
  }

  return metrics;
}

function computeBMI(): number | null {
  // Weight from Strava athlete: 70 kg. Height not available directly.
  // Typical Swedish male ~180 cm is a reasonable assumption from Aleris data.
  const weightKg = 70;
  const heightM = 1.8;
  return weightKg / (heightM * heightM);
}

function computeRunningStats(activities: StravaActivity[]): RunningStats {
  const runs = activities.filter(
    (a) => a.type === "Run" || a.sport_type === "Run"
  );

  const totalKm = runs.reduce((sum, r) => sum + r.distance, 0) / 1000;
  const totalRuns = runs.length;
  const avgSpeed =
    runs.length > 0
      ? runs.reduce((sum, r) => sum + r.average_speed, 0) / runs.length
      : 0;
  const avgDistanceKm = totalRuns > 0 ? totalKm / totalRuns : 0;

  const monthMap = new Map<string, { km: number; runs: number }>();
  for (const run of runs) {
    const month = run.start_date_local.slice(0, 7);
    const existing = monthMap.get(month) ?? { km: 0, runs: 0 };
    existing.km += run.distance / 1000;
    existing.runs += 1;
    monthMap.set(month, existing);
  }

  const monthlyBreakdown = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);

  return {
    totalKm,
    totalRuns,
    avgPace: formatPace(avgSpeed),
    avgDistanceKm,
    monthlyBreakdown,
  };
}

function findBiomarkerTrend(
  labReports: LabReport[],
  standardizedName: string
): { date: string; value: number; status: string }[] {
  const entries: { date: string; value: number; status: string }[] = [];
  for (const report of labReports) {
    const result = report.results.find(
      (r) => r.standardizedName === standardizedName
    );
    if (result && typeof result.value === "number") {
      entries.push({
        date: report.date,
        value: result.value,
        status: result.status,
      });
    }
  }
  return entries.reverse();
}

function trendArrow(values: { value: number }[]): string {
  if (values.length < 2) return "";
  const latest = values[values.length - 1].value;
  const previous = values[values.length - 2].value;
  const diff = latest - previous;
  const pct = Math.abs(diff / previous) * 100;
  if (pct < 3) return "→";
  return diff > 0 ? "↑" : "↓";
}

// ---------------------------------------------------------------------------
// PDF Drawing Helpers
// ---------------------------------------------------------------------------

function drawHorizontalBar(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  value: number,
  min: number,
  max: number,
  refMin: number | undefined,
  refMax: number | undefined,
  status: string
): void {
  const barHeight = 8;
  const range = max - min;
  if (range <= 0) return;

  // Background track
  doc.rect(x, y, width, barHeight).fill("#e5e7eb");

  // Reference range zone (green)
  if (refMin !== undefined && refMax !== undefined) {
    const refStartX = x + ((refMin - min) / range) * width;
    const refWidth = ((refMax - refMin) / range) * width;
    doc
      .rect(
        Math.max(refStartX, x),
        y,
        Math.min(refWidth, width - (refStartX - x)),
        barHeight
      )
      .fill("#bbf7d0");
  }

  // Value marker
  const markerX = x + Math.max(0, Math.min(1, (value - min) / range)) * width;
  doc
    .circle(markerX, y + barHeight / 2, 5)
    .fill(statusColor(status));
}

function drawStatCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  metric: MetricStat
): void {
  const statusFill =
    metric.status === "good"
      ? "#f0fdf4"
      : metric.status === "warning"
        ? "#fffbeb"
        : "#fef2f2";
  const borderColor =
    metric.status === "good"
      ? COLORS.green
      : metric.status === "warning"
        ? COLORS.orange
        : COLORS.red;

  doc.save();
  doc.roundedRect(x, y, width, height, 6).fill(statusFill);
  doc.roundedRect(x, y, width, height, 6).lineWidth(1.5).stroke(borderColor);

  // Status dot
  doc.circle(x + 14, y + 14, 4).fill(borderColor);

  // Label
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.medGray)
    .text(metric.label, x + 24, y + 9, { width: width - 30 });

  // Value
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.darkGray)
    .text(metric.value, x + 12, y + 28, { width: width - 24 });

  // Detail
  if (metric.detail) {
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.lightGray)
      .text(metric.detail, x + 12, y + 50, { width: width - 24 });
  }

  doc.restore();
}

function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  y: number
): number {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.darkBlue)
    .text(title, 50, y);
  doc
    .moveTo(50, y + 22)
    .lineTo(545, y + 22)
    .lineWidth(1)
    .strokeColor(COLORS.accent)
    .stroke();
  return y + 35;
}

function drawPageFooter(doc: PDFKit.PDFDocument, pageNum: number): void {
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.lightGray)
    .text(`Page ${pageNum}`, 50, 760, { width: 495, align: "center" })
    .text("Generated by Health Overview", 50, 748, {
      width: 495,
      align: "center",
    });
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: { text: string; x: number; width: number; align?: string; font?: string; color?: string }[],
  bgColor?: string
): void {
  if (bgColor) {
    doc.rect(45, y - 2, 505, 16).fill(bgColor);
  }
  for (const col of cols) {
    doc
      .font(col.font ?? "Helvetica")
      .fontSize(8.5)
      .fillColor(col.color ?? COLORS.darkGray)
      .text(col.text, col.x, y, {
        width: col.width,
        align: (col.align as "left" | "center" | "right") ?? "left",
      });
  }
}

// ---------------------------------------------------------------------------
// PDF Page Builders
// ---------------------------------------------------------------------------

function buildCoverPage(
  doc: PDFKit.PDFDocument,
  labReports: LabReport[],
  days: UnifiedDay[]
): void {
  const today = new Date().toISOString().slice(0, 10);

  // Background header block
  doc.rect(0, 0, 612, 320).fill(COLORS.darkBlue);

  // Title
  doc
    .font("Helvetica-Bold")
    .fontSize(36)
    .fillColor(COLORS.white)
    .text("Health Report", 50, 100, { width: 500 });

  doc
    .font("Helvetica")
    .fontSize(16)
    .fillColor("#93c5fd")
    .text("Hampus Jakobsson", 50, 150);

  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor("#93c5fd")
    .text(`Generated ${today}`, 50, 175);

  // Data range
  const firstDate = days.length > 0 ? days[0].date : "N/A";
  const lastDate = days.length > 0 ? days[days.length - 1].date : "N/A";
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#93c5fd")
    .text(`Data range: ${firstDate} to ${lastDate}`, 50, 200);

  doc
    .fontSize(10)
    .text(`Lab reports: ${labReports.length} available`, 50, 218);

  // Summary section below header
  const last90 = filterDaysSince(days, 90);
  const rhr = extractValues(last90, "restingHeartRate");
  const hrvVals = extractValues(last90, "hrv");
  const latestLab = labReports[0];
  const abnormals = latestLab
    ? latestLab.results.filter((r) => r.status !== "normal")
    : [];

  let summary = "Overall Health Summary\n\n";
  if (rhr.length > 0) {
    summary += `Cardiovascular health is excellent with a resting heart rate averaging ${Math.round(avg(rhr))} bpm, indicating strong aerobic fitness. `;
  }
  if (hrvVals.length > 0) {
    summary += `Heart rate variability averages ${Math.round(avg(hrvVals))} ms over the last 90 days. `;
  }
  if (latestLab) {
    summary += `The most recent lab panel (${latestLab.date}) shows ${latestLab.results.length} biomarkers tested`;
    if (abnormals.length > 0) {
      summary += `, with ${abnormals.length} value(s) outside reference ranges: ${abnormals.map((a) => a.standardizedName.replace(/_/g, " ")).join(", ")}. `;
    } else {
      summary += `, all within normal ranges. `;
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(COLORS.darkBlue)
    .text("Overview", 50, 350);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.medGray)
    .text(summary.trim(), 50, 375, { width: 500, lineGap: 4 });

  // Data sources
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(COLORS.darkBlue)
    .text("Data Sources", 50, 520);

  const sources = [
    "Apple Watch — steps, heart rate, VO2 max, sleep",
    "Oura Ring — HRV, SpO2, respiratory rate, sleep analysis",
    "Strava — running and activity tracking",
    "Lab Results — blood panels from Swedish healthcare + Aleris",
  ];
  let srcY = 545;
  for (const src of sources) {
    doc
      .circle(58, srcY + 4, 3)
      .fill(COLORS.accent);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.medGray)
      .text(src, 68, srcY, { width: 480 });
    srcY += 18;
  }

  drawPageFooter(doc, 1);
}

function buildKeyMetricsPage(
  doc: PDFKit.PDFDocument,
  metrics: MetricStat[]
): void {
  doc.addPage();
  let y = drawSectionHeader(doc, "Key Metrics Dashboard", 50);

  const cardWidth = 240;
  const cardHeight = 68;
  const gap = 15;

  for (let i = 0; i < metrics.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 50 + col * (cardWidth + gap);
    const cy = y + 10 + row * (cardHeight + gap);

    if (cy + cardHeight > 730) break;
    drawStatCard(doc, cx, cy, cardWidth, cardHeight, metrics[i]);
  }

  drawPageFooter(doc, 2);
}

function buildCardiovascularPage(
  doc: PDFKit.PDFDocument,
  days: UnifiedDay[],
  runningStats: RunningStats
): void {
  doc.addPage();
  let y = drawSectionHeader(doc, "Cardiovascular & Fitness", 50);

  // Resting HR section
  const last90 = filterDaysSince(days, 90);
  const last365 = filterDaysSince(days, 365);
  const rhr90 = extractValues(last90, "restingHeartRate");
  const rhr365 = extractValues(last365, "restingHeartRate");
  const hrv90 = extractValues(last90, "hrv");

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(COLORS.darkGray)
    .text("Resting Heart Rate", 50, y);
  y += 20;

  if (rhr90.length > 0) {
    const rows = [
      ["90-day average", `${Math.round(avg(rhr90))} bpm`],
      ["90-day minimum", `${Math.round(Math.min(...rhr90))} bpm`],
      ["90-day maximum", `${Math.round(Math.max(...rhr90))} bpm`],
      ["90-day median", `${Math.round(median(rhr90))} bpm`],
    ];
    if (rhr365.length > 0) {
      rows.push(["12-month average", `${Math.round(avg(rhr365))} bpm`]);
    }
    for (const [label, val] of rows) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.medGray)
        .text(label, 60, y, { continued: true, width: 200 })
        .font("Helvetica-Bold")
        .fillColor(COLORS.darkGray)
        .text(`  ${val}`, { width: 200 });
      y += 16;
    }
  }

  y += 10;
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(COLORS.darkGray)
    .text("Heart Rate Variability", 50, y);
  y += 20;

  if (hrv90.length > 0) {
    const hrvRows = [
      ["90-day average", `${Math.round(avg(hrv90))} ms`],
      ["90-day minimum", `${Math.round(Math.min(...hrv90))} ms`],
      ["90-day maximum", `${Math.round(Math.max(...hrv90))} ms`],
    ];
    for (const [label, val] of hrvRows) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.medGray)
        .text(label, 60, y, { continued: true, width: 200 })
        .font("Helvetica-Bold")
        .fillColor(COLORS.darkGray)
        .text(`  ${val}`, { width: 200 });
      y += 16;
    }
  }

  // VO2 Max
  const vo2Values = extractValues(days, "vo2Max").filter((v) => v > 0);
  if (vo2Values.length > 0) {
    y += 10;
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.darkGray)
      .text("VO2 Max", 50, y);
    y += 20;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.medGray)
      .text("Latest", 60, y, { continued: true, width: 200 })
      .font("Helvetica-Bold")
      .fillColor(COLORS.darkGray)
      .text(`  ${vo2Values[vo2Values.length - 1].toFixed(1)} mL/kg/min`);
    y += 16;

    // Classification for males 35-44: Superior >51, Excellent 43-51, Good 36-43, Fair 30-36
    const vo2 = vo2Values[vo2Values.length - 1];
    let classification = "Poor";
    if (vo2 > 51) classification = "Superior";
    else if (vo2 > 43) classification = "Excellent";
    else if (vo2 > 36) classification = "Good";
    else if (vo2 > 30) classification = "Fair";

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.medGray)
      .text("Classification", 60, y, { continued: true, width: 200 })
      .font("Helvetica-Bold")
      .fillColor(
        vo2 > 43
          ? COLORS.green
          : vo2 > 36
            ? COLORS.orange
            : COLORS.red
      )
      .text(`  ${classification}`);
    y += 25;
  }

  // Running stats
  doc
    .moveTo(50, y)
    .lineTo(545, y)
    .lineWidth(0.5)
    .strokeColor("#e5e7eb")
    .stroke();
  y += 15;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(COLORS.darkGray)
    .text("Running Activity", 50, y);
  y += 20;

  const runRows = [
    ["Total distance", `${runningStats.totalKm.toFixed(0)} km`],
    ["Total runs", `${runningStats.totalRuns}`],
    [
      "Avg distance per run",
      `${runningStats.avgDistanceKm.toFixed(1)} km`,
    ],
    ["Avg pace", runningStats.avgPace],
  ];
  for (const [label, val] of runRows) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.medGray)
      .text(label, 60, y, { continued: true, width: 200 })
      .font("Helvetica-Bold")
      .fillColor(COLORS.darkGray)
      .text(`  ${val}`, { width: 200 });
    y += 16;
  }

  // Monthly breakdown
  y += 10;
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.darkGray)
    .text("Monthly Running Distance (last 12 months)", 50, y);
  y += 18;

  // Table header
  drawTableRow(doc, y, [
    { text: "Month", x: 55, width: 100, font: "Helvetica-Bold", color: COLORS.medGray },
    { text: "Distance", x: 170, width: 80, font: "Helvetica-Bold", color: COLORS.medGray, align: "right" },
    { text: "Runs", x: 260, width: 50, font: "Helvetica-Bold", color: COLORS.medGray, align: "right" },
    { text: "Avg/run", x: 320, width: 80, font: "Helvetica-Bold", color: COLORS.medGray, align: "right" },
  ]);
  y += 16;

  // Bar chart + table
  const maxKm = Math.max(...runningStats.monthlyBreakdown.map((m) => m.km), 1);
  for (let i = 0; i < runningStats.monthlyBreakdown.length && y < 720; i++) {
    const m = runningStats.monthlyBreakdown[i];
    const bg = i % 2 === 0 ? COLORS.veryLightGray : undefined;

    drawTableRow(
      doc,
      y,
      [
        { text: m.month, x: 55, width: 100 },
        { text: `${m.km.toFixed(1)} km`, x: 170, width: 80, align: "right" },
        { text: `${m.runs}`, x: 260, width: 50, align: "right" },
        {
          text: `${(m.km / m.runs).toFixed(1)} km`,
          x: 320,
          width: 80,
          align: "right",
        },
      ],
      bg
    );

    // Mini bar
    const barWidth = (m.km / maxKm) * 120;
    doc
      .rect(415, y, barWidth, 10)
      .fill(COLORS.accent);

    y += 16;
  }

  drawPageFooter(doc, 3);
}

function buildSleepPage(doc: PDFKit.PDFDocument, days: UnifiedDay[]): void {
  doc.addPage();
  let y = drawSectionHeader(doc, "Sleep Analysis", 50);

  const last30 = filterDaysSince(days, 30);
  const last90 = filterDaysSince(days, 90);

  const sleepDur30 = extractValues(last30, "sleepDurationMinutes");
  const sleepDur90 = extractValues(last90, "sleepDurationMinutes");
  const spo2_30 = extractValues(last30, "oxygenSaturation");
  const respRate30 = extractValues(last30, "respiratoryRate");
  const deepSleep30 = extractValues(last30, "sleepDeepMinutes");
  const remSleep30 = extractValues(last30, "sleepREMMinutes");
  const lightSleep30 = extractValues(last30, "sleepLightMinutes");
  const awakeSleep30 = extractValues(last30, "sleepAwakeMinutes");

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(COLORS.darkGray)
    .text("Sleep Duration", 50, y);
  y += 20;

  const sleepRows: [string, string][] = [];
  if (sleepDur30.length > 0) {
    sleepRows.push(["30-day average", formatDuration(avg(sleepDur30))]);
    sleepRows.push(["30-day median", formatDuration(median(sleepDur30))]);
    sleepRows.push([
      "30-day range",
      `${formatDuration(Math.min(...sleepDur30))} – ${formatDuration(Math.max(...sleepDur30))}`,
    ]);
  }
  if (sleepDur90.length > 0) {
    sleepRows.push(["90-day average", formatDuration(avg(sleepDur90))]);
  }

  for (const [label, val] of sleepRows) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.medGray)
      .text(label, 60, y, { continued: true, width: 200 })
      .font("Helvetica-Bold")
      .fillColor(COLORS.darkGray)
      .text(`  ${val}`, { width: 200 });
    y += 16;
  }

  // Sleep stages
  if (deepSleep30.length > 0 || remSleep30.length > 0) {
    y += 15;
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.darkGray)
      .text("Sleep Stages (30-day avg)", 50, y);
    y += 20;

    const stages: [string, number[], string][] = [
      ["Deep sleep", deepSleep30, "#6366f1"],
      ["REM sleep", remSleep30, "#8b5cf6"],
      ["Light sleep", lightSleep30, "#a5b4fc"],
      ["Awake", awakeSleep30, "#e5e7eb"],
    ];

    const totalStageMinutes = stages.reduce(
      (sum, [, vals]) => sum + (vals.length > 0 ? avg(vals) : 0),
      0
    );

    for (const [label, values, color] of stages) {
      if (values.length === 0) continue;
      const avgMin = avg(values);
      const pct =
        totalStageMinutes > 0 ? (avgMin / totalStageMinutes) * 100 : 0;

      doc
        .rect(60, y, 12, 12)
        .fill(color);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.medGray)
        .text(label, 80, y + 1, { width: 100 });

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(COLORS.darkGray)
        .text(`${formatDuration(avgMin)} (${pct.toFixed(0)}%)`, 190, y + 1, {
          width: 150,
        });

      // Stage bar
      const barWidth = (pct / 100) * 200;
      doc
        .rect(310, y + 1, barWidth, 10)
        .fill(color);

      y += 18;
    }
  }

  // SpO2
  if (spo2_30.length > 0) {
    y += 15;
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.darkGray)
      .text("Blood Oxygen (SpO2)", 50, y);
    y += 20;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.medGray)
      .text("30-day average", 60, y, { continued: true, width: 200 })
      .font("Helvetica-Bold")
      .fillColor(COLORS.darkGray)
      .text(`  ${avg(spo2_30).toFixed(1)}%`, { width: 200 });
    y += 16;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.medGray)
      .text("Range", 60, y, { continued: true, width: 200 })
      .font("Helvetica-Bold")
      .fillColor(COLORS.darkGray)
      .text(
        `  ${Math.min(...spo2_30).toFixed(1)}% – ${Math.max(...spo2_30).toFixed(1)}%`,
        { width: 200 }
      );
    y += 16;
  }

  // Respiratory rate
  if (respRate30.length > 0) {
    y += 15;
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.darkGray)
      .text("Respiratory Rate", 50, y);
    y += 20;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.medGray)
      .text("30-day average", 60, y, { continued: true, width: 200 })
      .font("Helvetica-Bold")
      .fillColor(COLORS.darkGray)
      .text(`  ${avg(respRate30).toFixed(1)} breaths/min`, { width: 200 });
    y += 16;
  }

  drawPageFooter(doc, 4);
}

function buildLabResultsPage(
  doc: PDFKit.PDFDocument,
  labReports: LabReport[]
): void {
  doc.addPage();
  let y = drawSectionHeader(doc, "Lab Results — Most Recent", 50);

  const latest = labReports[0];
  if (!latest) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLORS.medGray)
      .text("No lab results available.", 50, y);
    drawPageFooter(doc, 5);
    return;
  }

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.medGray)
    .text(`Report date: ${latest.date}`, 50, y);
  y += 20;

  // Table header
  const headerCols = [
    { text: "Test", x: 50, width: 140, font: "Helvetica-Bold", color: COLORS.white },
    { text: "Value", x: 195, width: 55, font: "Helvetica-Bold", color: COLORS.white, align: "right" },
    { text: "Unit", x: 255, width: 55, font: "Helvetica-Bold", color: COLORS.white },
    { text: "Reference", x: 315, width: 80, font: "Helvetica-Bold", color: COLORS.white },
    { text: "Status", x: 400, width: 50, font: "Helvetica-Bold", color: COLORS.white, align: "center" },
    { text: "Trend", x: 455, width: 90, font: "Helvetica-Bold", color: COLORS.white, align: "center" },
  ];

  doc.rect(45, y - 2, 505, 16).fill(COLORS.darkBlue);
  for (const col of headerCols) {
    doc
      .font(col.font!)
      .fontSize(8)
      .fillColor(col.color!)
      .text(col.text, col.x, y, {
        width: col.width,
        align: (col.align as "left" | "center" | "right") ?? "left",
      });
  }
  y += 18;

  // Key biomarkers to track trends for
  const trendBiomarkers = [
    "hemoglobin",
    "ferritin",
    "iron",
    "zinc",
    "cobalamin",
    "vitamin_d",
    "folate",
    "creatinine",
    "homocysteine",
    "transferrin_saturation",
  ];

  // Group by category
  const categories = new Map<string, LabResult[]>();
  for (const result of latest.results) {
    const cat = result.category;
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(result);
  }

  for (const [category, results] of categories) {
    if (y > 710) {
      drawPageFooter(doc, 5);
      doc.addPage();
      y = 50;
    }

    // Category header
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLORS.accent)
      .text(category.toUpperCase(), 50, y, { width: 500 });
    y += 14;

    for (const result of results) {
      if (y > 720) {
        drawPageFooter(doc, 5);
        doc.addPage();
        y = 50;
      }

      const bg = result.status !== "normal" ? "#fef2f2" : undefined;

      const valueStr =
        typeof result.value === "number"
          ? result.value.toString()
          : String(result.value);

      // Trend info
      let trendStr = "";
      if (trendBiomarkers.includes(result.standardizedName)) {
        const trend = findBiomarkerTrend(labReports, result.standardizedName);
        if (trend.length >= 2) {
          const arrow = trendArrow(trend);
          const prev = trend[trend.length - 2];
          trendStr = `${arrow} (prev: ${prev.value})`;
        }
      }

      const statusLabel =
        result.status === "normal"
          ? "OK"
          : result.status.toUpperCase();

      drawTableRow(
        doc,
        y,
        [
          { text: result.standardizedName.replace(/_/g, " "), x: 50, width: 140 },
          {
            text: valueStr,
            x: 195,
            width: 55,
            align: "right",
            font: "Helvetica-Bold",
            color: statusColor(result.status),
          },
          { text: result.unit, x: 255, width: 55, color: COLORS.lightGray },
          {
            text: result.referenceRange.displayText,
            x: 315,
            width: 80,
            color: COLORS.lightGray,
          },
          {
            text: statusLabel,
            x: 400,
            width: 50,
            align: "center",
            font: "Helvetica-Bold",
            color: statusColor(result.status),
          },
          {
            text: trendStr,
            x: 455,
            width: 90,
            align: "center",
            color: COLORS.medGray,
          },
        ],
        bg
      );
      y += 16;
    }
    y += 6;
  }

  // Abnormal highlights
  const abnormals = latest.results.filter((r) => r.status !== "normal");
  if (abnormals.length > 0 && y < 680) {
    y += 10;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLORS.red)
      .text("Flagged Values", 50, y);
    y += 16;

    for (const ab of abnormals) {
      const valueStr =
        typeof ab.value === "number" ? ab.value.toString() : String(ab.value);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.darkGray)
        .text(
          `• ${ab.standardizedName.replace(/_/g, " ")}: ${valueStr} ${ab.unit} (${ab.status.toUpperCase()}) — ref: ${ab.referenceRange.displayText}`,
          60,
          y,
          { width: 480 }
        );
      y += 14;
    }
  }

  drawPageFooter(doc, 5);
}

function buildStrengthsWeaknessesPage(
  doc: PDFKit.PDFDocument,
  days: UnifiedDay[],
  labReports: LabReport[],
  runningStats: RunningStats,
  metrics: MetricStat[]
): void {
  doc.addPage();
  let y = drawSectionHeader(doc, "Strengths & Areas for Attention", 50);

  const last90 = filterDaysSince(days, 90);
  const rhr = extractValues(last90, "restingHeartRate");
  const hrvVals = extractValues(last90, "hrv");
  const vo2Values = extractValues(days, "vo2Max").filter((v) => v > 0);
  const latestLab = labReports[0];

  // Strengths
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLORS.green)
    .text("Strengths", 50, y);
  y += 20;

  const strengths: string[] = [];

  if (rhr.length > 0 && avg(rhr) < 55) {
    strengths.push(
      `Excellent resting heart rate (${Math.round(avg(rhr))} bpm avg) — indicates strong cardiovascular fitness, well below the 60–100 bpm normal range.`
    );
  }
  if (hrvVals.length > 0 && avg(hrvVals) > 45) {
    strengths.push(
      `Good HRV (${Math.round(avg(hrvVals))} ms avg) — indicates healthy autonomic nervous system function and recovery capacity.`
    );
  }
  if (vo2Values.length > 0 && vo2Values[vo2Values.length - 1] > 38) {
    strengths.push(
      `VO2 Max of ${vo2Values[vo2Values.length - 1].toFixed(1)} mL/kg/min — above average aerobic capacity.`
    );
  }
  if (runningStats.totalRuns > 50) {
    strengths.push(
      `Consistent running habit with ${runningStats.totalRuns} total runs (${runningStats.totalKm.toFixed(0)} km) logged on Strava.`
    );
  }

  if (latestLab) {
    const normals = latestLab.results.filter((r) => r.status === "normal");
    if (normals.length > latestLab.results.length * 0.8) {
      strengths.push(
        `${normals.length} of ${latestLab.results.length} biomarkers within reference range in latest labs (${latestLab.date}).`
      );
    }
    const vitD = latestLab.results.find(
      (r) => r.standardizedName === "vitamin_d"
    );
    if (vitD && typeof vitD.value === "number" && vitD.value >= 75) {
      strengths.push(
        `Excellent vitamin D level (${vitD.value} ${vitD.unit}) — optimal range maintained.`
      );
    }
    const crp = latestLab.results.find((r) => r.standardizedName === "crp");
    if (crp && crp.status === "normal") {
      strengths.push(
        `Low inflammation markers (CRP: ${crp.value} ${crp.unit}).`
      );
    }
  }

  for (const s of strengths) {
    doc
      .circle(58, y + 4, 3)
      .fill(COLORS.green);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text(s, 68, y, { width: 475 });
    y += Math.ceil(doc.heightOfString(s, { width: 475, fontSize: 9 }) / 14) * 14 + 6;
  }

  // Weaknesses
  y += 15;
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLORS.orange)
    .text("Areas Requiring Attention", 50, y);
  y += 20;

  const weaknesses: string[] = [];

  if (latestLab) {
    const abnormals = latestLab.results.filter((r) => r.status !== "normal");
    for (const ab of abnormals) {
      const trend = findBiomarkerTrend(labReports, ab.standardizedName);
      const trendNote =
        trend.length >= 2
          ? ` (previous: ${trend[trend.length - 2].value} on ${trend[trend.length - 2].date})`
          : "";
      weaknesses.push(
        `${ab.standardizedName.replace(/_/g, " ").toUpperCase()}: ${ab.value} ${ab.unit} — ${ab.status.toUpperCase()}. Reference: ${ab.referenceRange.displayText}${trendNote}`
      );
    }
  }

  // Check ferritin trend even if currently normal
  if (latestLab) {
    const ferritin = latestLab.results.find(
      (r) => r.standardizedName === "ferritin"
    );
    if (
      ferritin &&
      typeof ferritin.value === "number" &&
      ferritin.value < 60 &&
      ferritin.status === "normal"
    ) {
      weaknesses.push(
        `Ferritin is within range but suboptimal at ${ferritin.value} ${ferritin.unit} (optimal for athletes: >80 µg/L). Iron stores could be improved.`
      );
    }
  }

  if (weaknesses.length === 0) {
    weaknesses.push("No significant areas of concern identified.");
  }

  for (const w of weaknesses) {
    doc
      .circle(58, y + 4, 3)
      .fill(COLORS.orange);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.darkGray)
      .text(w, 68, y, { width: 475 });
    y += Math.ceil(doc.heightOfString(w, { width: 475, fontSize: 9 }) / 14) * 14 + 6;
  }

  drawPageFooter(doc, 6);
}

function buildRecommendationsPage(
  doc: PDFKit.PDFDocument,
  labReports: LabReport[]
): void {
  doc.addPage();
  let y = drawSectionHeader(doc, "Recommendations", 50);

  const latestLab = labReports[0];
  const sections: { title: string; items: string[] }[] = [];

  // Iron
  if (latestLab) {
    const iron = latestLab.results.find((r) => r.standardizedName === "iron");
    const ferritin = latestLab.results.find(
      (r) => r.standardizedName === "ferritin"
    );
    if (
      (iron && iron.status !== "normal") ||
      (ferritin &&
        typeof ferritin.value === "number" &&
        ferritin.value < 80)
    ) {
      sections.push({
        title: "Iron Optimization",
        items: [
          "Consider iron bisglycinate supplementation (25–50 mg every other day for better absorption).",
          "Take iron supplements on an empty stomach with vitamin C to enhance absorption.",
          "Avoid taking iron with coffee, tea, or calcium-rich foods within 2 hours.",
          "Retest ferritin and serum iron in 3 months to assess response.",
          "Target ferritin >80 µg/L for optimal athletic performance.",
        ],
      });
    }
  }

  // Zinc
  if (latestLab) {
    const zinc = latestLab.results.find(
      (r) => r.standardizedName === "zinc"
    );
    if (zinc && zinc.status !== "normal") {
      sections.push({
        title: "Zinc Supplementation",
        items: [
          "Consider zinc picolinate or zinc citrate 15–30 mg daily.",
          "Take zinc with food to minimize gastrointestinal discomfort.",
          "Separate zinc supplementation from iron by at least 2 hours (they compete for absorption).",
          "Retest zinc levels in 3 months.",
          "Zinc supports immune function, wound healing, and testosterone production.",
        ],
      });
    }
  }

  // Monitoring
  sections.push({
    title: "Monitoring Schedule",
    items: [
      "Comprehensive blood panel every 3–4 months to track iron, zinc, and other biomarkers.",
      "Continue daily tracking with Apple Watch and Oura Ring for cardiovascular and sleep metrics.",
      "Monitor resting heart rate trends — any sustained increase >5 bpm may indicate overtraining or illness.",
      "Track HRV trends — declining baseline HRV over weeks may indicate accumulated fatigue.",
      "Annual comprehensive health checkup (Aleris or similar).",
    ],
  });

  // General wellness
  sections.push({
    title: "General Wellness",
    items: [
      "Maintain current running consistency — aim for 3–4 runs per week.",
      "Prioritize 7–8 hours of sleep per night for optimal recovery.",
      "Continue vitamin D supplementation during Nordic winter months (Oct–Mar).",
      "Stay hydrated — aim for 2–3 L of water daily, more on running days.",
    ],
  });

  for (const section of sections) {
    if (y > 680) {
      drawPageFooter(doc, 7);
      doc.addPage();
      y = 50;
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(COLORS.darkBlue)
      .text(section.title, 50, y);
    y += 20;

    for (const item of section.items) {
      if (y > 720) {
        drawPageFooter(doc, 7);
        doc.addPage();
        y = 50;
      }
      doc
        .circle(58, y + 4, 3)
        .fill(COLORS.accent);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(COLORS.darkGray)
        .text(item, 68, y, { width: 475 });
      y += Math.ceil(doc.heightOfString(item, { width: 475, fontSize: 9 }) / 14) * 14 + 4;
    }

    y += 15;
  }

  // Disclaimer
  y += 10;
  doc
    .moveTo(50, y)
    .lineTo(545, y)
    .lineWidth(0.5)
    .strokeColor("#e5e7eb")
    .stroke();
  y += 15;

  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor(COLORS.lightGray)
    .text(
      "Disclaimer: This report is generated from personal health tracking data and lab results for informational purposes only. It does not constitute medical advice. Always consult with a qualified healthcare professional before making changes to medications, supplements, or health routines.",
      50,
      y,
      { width: 500, lineGap: 3 }
    );

  drawPageFooter(doc, 7);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log("Loading data sources...");
  const labReports = loadLabResults();
  const dailyMetrics = loadDailyMetrics();
  const stravaActivities = loadStravaActivities();

  console.log(`  Lab reports: ${labReports.length}`);
  console.log(`  Daily metrics: ${dailyMetrics.length} days`);
  console.log(`  Strava activities: ${stravaActivities.length}`);

  console.log("Computing statistics...");
  const keyMetrics = computeKeyMetrics(dailyMetrics, labReports);
  const runningStats = computeRunningStats(stravaActivities);

  console.log("Generating PDF...");
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: "Health Report — Hampus Jakobsson",
      Author: "Health Overview",
      Subject: "Comprehensive Health Report",
      CreationDate: new Date(),
    },
  });

  const reportsDir = path.join(ROOT, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const today = new Date().toISOString().slice(0, 10);
  const outputPath = path.join(reportsDir, `health-report-${today}.pdf`);
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  buildCoverPage(doc, labReports, dailyMetrics);
  buildKeyMetricsPage(doc, keyMetrics);
  buildCardiovascularPage(doc, dailyMetrics, runningStats);
  buildSleepPage(doc, dailyMetrics);
  buildLabResultsPage(doc, labReports);
  buildStrengthsWeaknessesPage(
    doc,
    dailyMetrics,
    labReports,
    runningStats,
    keyMetrics
  );
  buildRecommendationsPage(doc, labReports);

  doc.end();

  writeStream.on("finish", () => {
    console.log(`\nPDF generated successfully: ${outputPath}`);
  });

  writeStream.on("error", (err) => {
    console.error("Failed to write PDF:", err);
    process.exit(1);
  });
}

main();
