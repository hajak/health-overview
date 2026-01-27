import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface DailyData {
  date: string;
  steps: number;
  activeCalories: number;
  distance: number;
  exerciseMinutes: number;
  standHours: number;
  restingHeartRate: number | null;
  avgHeartRate: number | null;
  hrv: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  sleepDuration: number | null; // minutes
  sleepInBed: number | null; // minutes
  sleepCore: number | null; // minutes (light sleep)
  sleepDeep: number | null; // minutes
  sleepREM: number | null; // minutes
  sleepAwake: number | null; // minutes
  wristTemperature: number | null;
  vo2Max: number | null;
}

interface BodyMeasurement {
  date: string;
  weight: number | null;
  height: number | null;
}

const xmlPath = path.join(process.cwd(), 'DATA', 'apple_health_export', 'export.xml');
const outputDir = path.join(process.cwd(), 'DATA', 'apple_health');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Daily aggregations
const dailySteps = new Map<string, number>();
const dailyActiveCalories = new Map<string, number>();
const dailyDistance = new Map<string, number>();
const dailyExerciseMinutes = new Map<string, number>();
const dailyHeartRates = new Map<string, number[]>();
const dailyRestingHR = new Map<string, number[]>();
const dailyHRV = new Map<string, number[]>();
const dailyRespiratoryRate = new Map<string, number[]>();
const dailyOxygenSaturation = new Map<string, number[]>();
const dailyVO2Max = new Map<string, number[]>();
const dailyWristTemp = new Map<string, number[]>();

// Sleep data - keyed by the night (date when sleep started)
const sleepInBed = new Map<string, number>(); // minutes
const sleepAsleep = new Map<string, number>(); // total asleep minutes
const sleepCore = new Map<string, number>(); // light sleep minutes
const sleepDeep = new Map<string, number>(); // deep sleep minutes
const sleepREM = new Map<string, number>(); // REM minutes
const sleepAwake = new Map<string, number>(); // awake during night minutes

const bodyMeasurements: BodyMeasurement[] = [];

function extractDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function parseRecordLine(line: string): void {
  const typeMatch = line.match(/type="([^"]+)"/);
  if (!typeMatch) return;
  const type = typeMatch[1];

  const valueMatch = line.match(/value="([^"]+)"/);
  const value = valueMatch ? valueMatch[1] : null;

  const dateMatch = line.match(/startDate="([^"]+)"/);
  if (!dateMatch) return;
  const startDateStr = dateMatch[1];
  const date = extractDate(startDateStr);

  const endDateMatch = line.match(/endDate="([^"]+)"/);
  const endDateStr = endDateMatch ? endDateMatch[1] : startDateStr;

  // Calculate duration in minutes for sleep records
  const getDurationMinutes = (): number => {
    const start = new Date(startDateStr.replace(' +', '+').replace(' ', 'T'));
    const end = new Date(endDateStr.replace(' +', '+').replace(' ', 'T'));
    return (end.getTime() - start.getTime()) / (1000 * 60);
  };

  // For sleep, use the night date (date when sleep started, or previous day if after midnight but before 6am)
  const getSleepNightDate = (): string => {
    const hour = parseInt(startDateStr.slice(11, 13));
    if (hour < 6) {
      // Sleep started after midnight, count it as previous night
      const d = new Date(date);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    }
    return date;
  };

  const numValue = value ? parseFloat(value) : null;

  switch (type) {
    case 'HKQuantityTypeIdentifierStepCount':
      if (numValue !== null && !isNaN(numValue)) {
        dailySteps.set(date, (dailySteps.get(date) || 0) + numValue);
      }
      break;

    case 'HKQuantityTypeIdentifierActiveEnergyBurned':
      if (numValue !== null && !isNaN(numValue)) {
        dailyActiveCalories.set(date, (dailyActiveCalories.get(date) || 0) + numValue);
      }
      break;

    case 'HKQuantityTypeIdentifierDistanceWalkingRunning':
      if (numValue !== null && !isNaN(numValue)) {
        const unitMatch = line.match(/unit="([^"]+)"/);
        const unit = unitMatch ? unitMatch[1] : 'm';
        let distanceM = numValue;
        if (unit === 'km') distanceM = numValue * 1000;
        dailyDistance.set(date, (dailyDistance.get(date) || 0) + distanceM);
      }
      break;

    case 'HKQuantityTypeIdentifierAppleExerciseTime':
      if (numValue !== null && !isNaN(numValue)) {
        dailyExerciseMinutes.set(date, (dailyExerciseMinutes.get(date) || 0) + numValue);
      }
      break;

    case 'HKQuantityTypeIdentifierHeartRate':
      if (numValue !== null && !isNaN(numValue)) {
        if (!dailyHeartRates.has(date)) dailyHeartRates.set(date, []);
        dailyHeartRates.get(date)!.push(numValue);
      }
      break;

    case 'HKQuantityTypeIdentifierRestingHeartRate':
      if (numValue !== null && !isNaN(numValue)) {
        if (!dailyRestingHR.has(date)) dailyRestingHR.set(date, []);
        dailyRestingHR.get(date)!.push(numValue);
      }
      break;

    case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
      if (numValue !== null && !isNaN(numValue)) {
        if (!dailyHRV.has(date)) dailyHRV.set(date, []);
        dailyHRV.get(date)!.push(numValue);
      }
      break;

    case 'HKQuantityTypeIdentifierRespiratoryRate':
      if (numValue !== null && !isNaN(numValue)) {
        if (!dailyRespiratoryRate.has(date)) dailyRespiratoryRate.set(date, []);
        dailyRespiratoryRate.get(date)!.push(numValue);
      }
      break;

    case 'HKQuantityTypeIdentifierOxygenSaturation':
      if (numValue !== null && !isNaN(numValue)) {
        // Convert to percentage if needed (Apple stores as decimal 0-1)
        const spO2 = numValue <= 1 ? numValue * 100 : numValue;
        if (!dailyOxygenSaturation.has(date)) dailyOxygenSaturation.set(date, []);
        dailyOxygenSaturation.get(date)!.push(spO2);
      }
      break;

    case 'HKQuantityTypeIdentifierVO2Max':
      if (numValue !== null && !isNaN(numValue)) {
        if (!dailyVO2Max.has(date)) dailyVO2Max.set(date, []);
        dailyVO2Max.get(date)!.push(numValue);
      }
      break;

    case 'HKQuantityTypeIdentifierAppleSleepingWristTemperature':
      if (numValue !== null && !isNaN(numValue)) {
        if (!dailyWristTemp.has(date)) dailyWristTemp.set(date, []);
        dailyWristTemp.get(date)!.push(numValue);
      }
      break;

    case 'HKQuantityTypeIdentifierBodyMass':
      if (numValue !== null && !isNaN(numValue)) {
        bodyMeasurements.push({ date, weight: numValue, height: null });
      }
      break;

    case 'HKQuantityTypeIdentifierHeight':
      if (numValue !== null && !isNaN(numValue)) {
        bodyMeasurements.push({ date, weight: null, height: numValue });
      }
      break;

    case 'HKCategoryTypeIdentifierSleepAnalysis':
      if (value) {
        const nightDate = getSleepNightDate();
        const duration = getDurationMinutes();

        if (duration > 0 && duration < 1440) { // Sanity check: less than 24 hours
          if (value === 'HKCategoryValueSleepAnalysisInBed') {
            sleepInBed.set(nightDate, (sleepInBed.get(nightDate) || 0) + duration);
          } else if (value === 'HKCategoryValueSleepAnalysisAsleepUnspecified') {
            sleepAsleep.set(nightDate, (sleepAsleep.get(nightDate) || 0) + duration);
          } else if (value === 'HKCategoryValueSleepAnalysisAsleepCore') {
            sleepCore.set(nightDate, (sleepCore.get(nightDate) || 0) + duration);
          } else if (value === 'HKCategoryValueSleepAnalysisAsleepDeep') {
            sleepDeep.set(nightDate, (sleepDeep.get(nightDate) || 0) + duration);
          } else if (value === 'HKCategoryValueSleepAnalysisAsleepREM') {
            sleepREM.set(nightDate, (sleepREM.get(nightDate) || 0) + duration);
          } else if (value === 'HKCategoryValueSleepAnalysisAwake') {
            sleepAwake.set(nightDate, (sleepAwake.get(nightDate) || 0) + duration);
          }
        }
      }
      break;
  }
}

async function parseFile(): Promise<void> {
  console.log('Starting to parse Apple Health export...');
  console.log(`File: ${xmlPath}`);

  const fileStream = fs.createReadStream(xmlPath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let recordCount = 0;

  for await (const line of rl) {
    lineCount++;

    if (lineCount % 500000 === 0) {
      console.log(`Processed ${lineCount.toLocaleString()} lines...`);
    }

    const trimmed = line.trim();

    if (trimmed.startsWith('<Record')) {
      parseRecordLine(trimmed);
      recordCount++;
    }
  }

  console.log(`\nParsing complete!`);
  console.log(`Total lines: ${lineCount.toLocaleString()}`);
  console.log(`Records parsed: ${recordCount.toLocaleString()}`);
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function buildDailyData(): DailyData[] {
  const allDates = new Set<string>();

  // Collect all dates from all data sources
  [dailySteps, dailyActiveCalories, dailyDistance, dailyHeartRates,
   dailyHRV, dailyRestingHR, dailyRespiratoryRate, dailyOxygenSaturation,
   sleepInBed, sleepAsleep, sleepCore, sleepDeep, sleepREM].forEach(map => {
    map.forEach((_, date) => allDates.add(date));
  });

  const dailyData: DailyData[] = [];

  for (const date of Array.from(allDates).sort()) {
    const heartRates = dailyHeartRates.get(date) || [];
    const avgHR = avg(heartRates);

    // Use official resting HR if available, otherwise estimate from lowest 10%
    const restingHRValues = dailyRestingHR.get(date);
    let restingHR: number | null = null;
    if (restingHRValues && restingHRValues.length > 0) {
      restingHR = avg(restingHRValues);
    } else if (heartRates.length > 10) {
      const sorted = [...heartRates].sort((a, b) => a - b);
      const lowest10Pct = sorted.slice(0, Math.ceil(sorted.length * 0.1));
      restingHR = avg(lowest10Pct);
    }

    // Calculate total sleep duration from stages or unspecified
    const core = sleepCore.get(date) || 0;
    const deep = sleepDeep.get(date) || 0;
    const rem = sleepREM.get(date) || 0;
    const unspecified = sleepAsleep.get(date) || 0;
    const awake = sleepAwake.get(date) || 0;

    // Total sleep is either the sum of stages or unspecified (older data without stages)
    const sleepFromStages = core + deep + rem;
    const totalSleep = sleepFromStages > 0 ? sleepFromStages : unspecified;

    dailyData.push({
      date,
      steps: Math.round(dailySteps.get(date) || 0),
      activeCalories: Math.round(dailyActiveCalories.get(date) || 0),
      distance: Math.round(dailyDistance.get(date) || 0),
      exerciseMinutes: Math.round(dailyExerciseMinutes.get(date) || 0),
      standHours: 0,
      restingHeartRate: restingHR,
      avgHeartRate: avgHR,
      hrv: avg(dailyHRV.get(date) || []),
      respiratoryRate: avg(dailyRespiratoryRate.get(date) || []),
      oxygenSaturation: avg(dailyOxygenSaturation.get(date) || []),
      sleepDuration: totalSleep > 0 ? Math.round(totalSleep) : null,
      sleepInBed: sleepInBed.has(date) ? Math.round(sleepInBed.get(date)!) : null,
      sleepCore: core > 0 ? Math.round(core) : null,
      sleepDeep: deep > 0 ? Math.round(deep) : null,
      sleepREM: rem > 0 ? Math.round(rem) : null,
      sleepAwake: awake > 0 ? Math.round(awake) : null,
      wristTemperature: avg(dailyWristTemp.get(date) || []),
      vo2Max: avg(dailyVO2Max.get(date) || []),
    });
  }

  return dailyData;
}

function consolidateBodyMeasurements() {
  const weightMap = new Map<string, number>();
  const heightMap = new Map<string, number>();

  for (const m of bodyMeasurements) {
    if (m.weight !== null) weightMap.set(m.date, m.weight);
    if (m.height !== null) heightMap.set(m.date, m.height);
  }

  return {
    weights: Array.from(weightMap.entries())
      .map(([date, weight]) => ({ date, weight }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    heights: Array.from(heightMap.entries())
      .map(([date, height]) => ({ date, height }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

async function main(): Promise<void> {
  await parseFile();

  console.log('\nBuilding daily data...');
  const dailyData = buildDailyData();
  console.log(`Daily records: ${dailyData.length}`);

  // Count data availability
  const withHRV = dailyData.filter(d => d.hrv !== null).length;
  const withRestingHR = dailyData.filter(d => d.restingHeartRate !== null).length;
  const withSleep = dailyData.filter(d => d.sleepDuration !== null).length;
  const withSpO2 = dailyData.filter(d => d.oxygenSaturation !== null).length;
  const withVO2Max = dailyData.filter(d => d.vo2Max !== null).length;
  const withSleepStages = dailyData.filter(d => d.sleepCore !== null).length;

  console.log(`\nData availability:`);
  console.log(`  HRV: ${withHRV} days`);
  console.log(`  Resting HR: ${withRestingHR} days`);
  console.log(`  Sleep duration: ${withSleep} days`);
  console.log(`  Sleep stages: ${withSleepStages} days`);
  console.log(`  SpO2: ${withSpO2} days`);
  console.log(`  VO2 Max: ${withVO2Max} days`);

  console.log('\nConsolidating body measurements...');
  const body = consolidateBodyMeasurements();
  console.log(`Weight measurements: ${body.weights.length}`);
  console.log(`Height measurements: ${body.heights.length}`);

  // Save daily data
  const dailyPath = path.join(outputDir, 'daily_data.json');
  fs.writeFileSync(dailyPath, JSON.stringify({ data: dailyData }, null, 2));
  console.log(`\nSaved daily data to ${dailyPath}`);

  // Save body measurements
  const bodyPath = path.join(outputDir, 'body_measurements.json');
  fs.writeFileSync(bodyPath, JSON.stringify(body, null, 2));
  console.log(`Saved body measurements to ${bodyPath}`);

  // Print summary statistics
  console.log('\n--- Summary Statistics ---');
  if (dailyData.length > 0) {
    const avgSteps = Math.round(dailyData.reduce((sum, d) => sum + d.steps, 0) / dailyData.length);
    const avgCalories = Math.round(dailyData.reduce((sum, d) => sum + d.activeCalories, 0) / dailyData.length);
    const hrvDays = dailyData.filter(d => d.hrv !== null);
    const avgHRV = hrvDays.length > 0
      ? Math.round(hrvDays.reduce((sum, d) => sum + (d.hrv || 0), 0) / hrvDays.length)
      : 'N/A';
    const sleepDays = dailyData.filter(d => d.sleepDuration !== null);
    const avgSleep = sleepDays.length > 0
      ? Math.round(sleepDays.reduce((sum, d) => sum + (d.sleepDuration || 0), 0) / sleepDays.length)
      : 0;

    console.log(`Date range: ${dailyData[0].date} to ${dailyData[dailyData.length - 1].date}`);
    console.log(`Average daily steps: ${avgSteps.toLocaleString()}`);
    console.log(`Average daily active calories: ${avgCalories.toLocaleString()}`);
    console.log(`Average HRV: ${avgHRV} ms`);
    console.log(`Average sleep: ${Math.floor(avgSleep / 60)}h ${avgSleep % 60}m`);
  }
}

main().catch(console.error);
