import Head from 'next/head';
import { GetServerSideProps } from 'next';
import * as fs from 'fs';
import * as path from 'path';
import { LabCategory, ResultStatus, CATEGORY_DISPLAY_NAMES } from '../types/labResults';
import { UnifiedDailyRecord } from '../types/unified';

interface LabResult {
  testName: string;
  standardizedName: string;
  value: number | string;
  unit: string;
  referenceRange: {
    min?: number;
    max?: number;
    displayText: string;
  };
  status: ResultStatus;
  category: LabCategory;
}

interface LabReport {
  date: string;
  results: LabResult[];
}

interface TestTrend {
  name: string;
  standardizedName: string;
  unit: string;
  category: LabCategory;
  referenceRange: { min?: number; max?: number; displayText: string };
  history: { date: string; value: number; status: ResultStatus }[];
  latestValue: number;
  latestStatus: ResultStatus;
}

interface Recommendation {
  id: string;
  category: 'supplement' | 'lifestyle' | 'diet' | 'monitoring';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  relatedTests?: string[];
  dosage?: string;
  timing?: string;
}

interface HealthInsight {
  metric: string;
  status: 'good' | 'attention' | 'concern';
  value: string;
  trend?: 'improving' | 'stable' | 'declining';
  message: string;
}

interface Props {
  recommendations: Recommendation[];
  healthInsights: HealthInsight[];
  abnormalTests: TestTrend[];
  lastLabDate: string | null;
  avgSleep: number | null;
  avgSteps: number | null;
  avgHrv: number | null;
}

const PRIORITY_COLORS = {
  high: 'border-red-300 bg-red-50',
  medium: 'border-yellow-300 bg-yellow-50',
  low: 'border-blue-300 bg-blue-50',
};

const PRIORITY_BADGE = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
};

const CATEGORY_ICONS = {
  supplement: '💊',
  lifestyle: '🏃',
  diet: '🥗',
  monitoring: '📊',
};

function generateRecommendations(
  abnormalTests: TestTrend[],
  avgSleep: number | null,
  avgSteps: number | null,
  avgHrv: number | null
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const test of abnormalTests) {
    const standardized = test.standardizedName.toLowerCase();

    if (standardized === 'vitamin_d' && test.latestStatus === 'low') {
      recommendations.push({
        id: 'vitamin-d-supplement',
        category: 'supplement',
        priority: 'high',
        title: 'Vitamin D3 Supplementation',
        description: 'Your Vitamin D levels are below optimal range. Supplementation is recommended, especially during winter months.',
        rationale: `Your latest Vitamin D was ${test.latestValue} ${test.unit} (reference: ${test.referenceRange.displayText}). Low vitamin D is associated with immune dysfunction, bone health issues, and mood disturbances.`,
        relatedTests: ['vitamin_d'],
        dosage: '2000-4000 IU daily',
        timing: 'With a meal containing fat for better absorption',
      });
    }

    if ((standardized === 'iron' || standardized === 'ferritin') && test.latestStatus === 'low') {
      recommendations.push({
        id: 'iron-supplement',
        category: 'supplement',
        priority: 'high',
        title: 'Iron Supplementation',
        description: 'Your iron markers indicate low iron stores. Consider iron supplementation with vitamin C for enhanced absorption.',
        rationale: `Your ${test.name} was ${test.latestValue} ${test.unit} (reference: ${test.referenceRange.displayText}). Low iron can cause fatigue, weakness, and impaired cognitive function.`,
        relatedTests: ['iron', 'ferritin'],
        dosage: '18-27mg elemental iron daily',
        timing: 'On an empty stomach with vitamin C. Avoid taking with calcium, coffee, or tea.',
      });
    }

    if (standardized === 'cobalamin' && test.latestStatus === 'low') {
      recommendations.push({
        id: 'b12-supplement',
        category: 'supplement',
        priority: 'high',
        title: 'Vitamin B12 Supplementation',
        description: 'Your B12 levels are suboptimal. Consider methylcobalamin supplementation.',
        rationale: `Your Cobalamin was ${test.latestValue} ${test.unit} (reference: ${test.referenceRange.displayText}). B12 deficiency can cause neurological symptoms and fatigue.`,
        relatedTests: ['cobalamin'],
        dosage: '1000-2000 mcg methylcobalamin daily',
        timing: 'Morning, sublingually for best absorption',
      });
    }

    if (standardized === 'folate' && test.latestStatus === 'low') {
      recommendations.push({
        id: 'folate-supplement',
        category: 'supplement',
        priority: 'medium',
        title: 'Folate Supplementation',
        description: 'Consider methylfolate supplementation to support cellular function and homocysteine metabolism.',
        rationale: `Your folate was ${test.latestValue} ${test.unit}. Adequate folate is essential for DNA synthesis and methylation.`,
        relatedTests: ['folate'],
        dosage: '400-800 mcg methylfolate daily',
        timing: 'Morning with food',
      });
    }

    if (standardized === 'homocysteine' && test.latestStatus === 'high') {
      recommendations.push({
        id: 'homocysteine-support',
        category: 'supplement',
        priority: 'high',
        title: 'Homocysteine Support Protocol',
        description: 'Elevated homocysteine requires B-vitamin support to reduce cardiovascular risk.',
        rationale: `Your homocysteine was ${test.latestValue} ${test.unit}. Elevated levels are associated with cardiovascular disease risk.`,
        relatedTests: ['homocysteine'],
        dosage: 'B6 (25-50mg), B12 (1000mcg), Folate (800mcg) daily',
        timing: 'Morning with food',
      });
    }

    if (standardized === 'magnesium' && test.latestStatus === 'low') {
      recommendations.push({
        id: 'magnesium-supplement',
        category: 'supplement',
        priority: 'medium',
        title: 'Magnesium Supplementation',
        description: 'Your magnesium levels are suboptimal. Magnesium glycinate is well-absorbed and gentle on the stomach.',
        rationale: `Your magnesium was ${test.latestValue} ${test.unit}. Magnesium is crucial for over 300 enzymatic reactions including sleep and muscle function.`,
        relatedTests: ['magnesium'],
        dosage: '200-400mg magnesium glycinate daily',
        timing: 'Evening, before bed for sleep support',
      });
    }

    if ((standardized === 'ldl' || standardized === 'ldl_cholesterol') && test.latestStatus === 'high') {
      recommendations.push({
        id: 'ldl-lifestyle',
        category: 'lifestyle',
        priority: 'high',
        title: 'Cardiovascular Risk Reduction',
        description: 'Elevated LDL cholesterol warrants lifestyle modifications and potentially supplementation.',
        rationale: `Your LDL was ${test.latestValue} ${test.unit}. Elevated LDL is a major cardiovascular risk factor.`,
        relatedTests: ['ldl', 'ldl_cholesterol'],
      });
      recommendations.push({
        id: 'omega3-supplement',
        category: 'supplement',
        priority: 'medium',
        title: 'Omega-3 Fish Oil',
        description: 'EPA/DHA supplementation may help improve lipid profile and reduce inflammation.',
        rationale: 'Omega-3 fatty acids support cardiovascular health and may help lower triglycerides.',
        relatedTests: ['ldl', 'triglycerides'],
        dosage: '2-4g EPA+DHA combined daily',
        timing: 'With meals for better absorption',
      });
    }

    if (standardized === 'tsh' && (test.latestStatus === 'high' || test.latestStatus === 'low')) {
      recommendations.push({
        id: 'thyroid-monitoring',
        category: 'monitoring',
        priority: 'high',
        title: 'Thyroid Function Follow-up',
        description: 'Abnormal TSH levels require follow-up testing and potential consultation with an endocrinologist.',
        rationale: `Your TSH was ${test.latestValue} ${test.unit} (${test.latestStatus}). Thyroid dysfunction can affect metabolism, energy, and mood.`,
        relatedTests: ['tsh', 't3', 't4'],
      });
    }

    if (standardized === 'crp' && test.latestStatus === 'high') {
      recommendations.push({
        id: 'inflammation-protocol',
        category: 'lifestyle',
        priority: 'high',
        title: 'Anti-Inflammatory Protocol',
        description: 'Elevated CRP indicates systemic inflammation. Focus on anti-inflammatory diet and lifestyle.',
        rationale: `Your CRP was ${test.latestValue} ${test.unit}. Chronic inflammation is linked to many diseases.`,
        relatedTests: ['crp'],
      });
      recommendations.push({
        id: 'curcumin-supplement',
        category: 'supplement',
        priority: 'medium',
        title: 'Curcumin Supplementation',
        description: 'Curcumin has potent anti-inflammatory properties and may help reduce CRP levels.',
        rationale: 'Studies show curcumin can reduce inflammatory markers including CRP.',
        relatedTests: ['crp'],
        dosage: '500-1000mg curcumin with piperine daily',
        timing: 'With meals',
      });
    }

    if (standardized === 'glucose' && test.latestStatus === 'high') {
      recommendations.push({
        id: 'glucose-management',
        category: 'lifestyle',
        priority: 'high',
        title: 'Blood Sugar Management',
        description: 'Elevated fasting glucose requires dietary modifications and increased physical activity.',
        rationale: `Your fasting glucose was ${test.latestValue} ${test.unit}. Elevated glucose increases risk of diabetes.`,
        relatedTests: ['glucose', 'hba1c'],
      });
    }
  }

  if (avgSleep !== null && avgSleep < 420) {
    recommendations.push({
      id: 'sleep-improvement',
      category: 'lifestyle',
      priority: 'high',
      title: 'Sleep Duration Improvement',
      description: `Your average sleep is ${Math.round(avgSleep / 60 * 10) / 10} hours. Adults need 7-9 hours for optimal health and recovery.`,
      rationale: 'Insufficient sleep impairs immune function, cognitive performance, and metabolic health.',
    });
    recommendations.push({
      id: 'magnesium-sleep',
      category: 'supplement',
      priority: 'medium',
      title: 'Magnesium for Sleep Support',
      description: 'Magnesium glycinate can help improve sleep quality and duration.',
      rationale: 'Magnesium supports GABA activity and helps regulate the sleep-wake cycle.',
      dosage: '200-400mg before bed',
      timing: '30-60 minutes before sleep',
    });
  }

  if (avgSteps !== null && avgSteps < 7000) {
    recommendations.push({
      id: 'activity-increase',
      category: 'lifestyle',
      priority: 'medium',
      title: 'Increase Daily Movement',
      description: `Your average daily steps is ${Math.round(avgSteps).toLocaleString()}. Aim for at least 8,000-10,000 steps for optimal health.`,
      rationale: 'Higher step counts are associated with reduced all-cause mortality and improved metabolic health.',
    });
  }

  if (avgHrv !== null && avgHrv < 30) {
    recommendations.push({
      id: 'hrv-improvement',
      category: 'lifestyle',
      priority: 'medium',
      title: 'HRV and Stress Management',
      description: `Your average HRV is ${Math.round(avgHrv)}ms. Focus on stress reduction and recovery practices.`,
      rationale: 'Low HRV indicates chronic stress or insufficient recovery. Improving HRV is associated with better health outcomes.',
    });
    recommendations.push({
      id: 'ashwagandha-supplement',
      category: 'supplement',
      priority: 'low',
      title: 'Ashwagandha for Stress Support',
      description: 'Ashwagandha is an adaptogen that may help reduce cortisol and improve stress resilience.',
      rationale: 'Studies show ashwagandha can reduce cortisol levels and improve HRV.',
      dosage: '300-600mg KSM-66 extract daily',
      timing: 'Morning or evening with food',
    });
  }

  const hasNoAbnormal = abnormalTests.length === 0;
  const goodSleep = avgSleep !== null && avgSleep >= 420;
  const goodActivity = avgSteps !== null && avgSteps >= 8000;

  if (hasNoAbnormal && goodSleep && goodActivity && recommendations.length === 0) {
    recommendations.push({
      id: 'maintenance',
      category: 'lifestyle',
      priority: 'low',
      title: 'Maintain Current Protocol',
      description: 'Your labs and health metrics are in good shape. Continue your current lifestyle practices.',
      rationale: 'All tracked biomarkers are within normal range and activity/sleep metrics are healthy.',
    });
  }

  recommendations.push({
    id: 'vitamin-d-maintenance',
    category: 'supplement',
    priority: 'low',
    title: 'Vitamin D3 Maintenance',
    description: 'Even with normal levels, vitamin D supplementation is beneficial, especially in northern latitudes.',
    rationale: 'Most people in northern climates are vitamin D insufficient. Maintaining levels of 50-80 nmol/L is optimal.',
    dosage: '1000-2000 IU daily',
    timing: 'With a meal containing fat',
  });

  const uniqueRecommendations = recommendations.filter(
    (rec, index, self) => index === self.findIndex((r) => r.id === rec.id)
  );

  return uniqueRecommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function generateHealthInsights(
  avgSleep: number | null,
  avgSteps: number | null,
  avgHrv: number | null
): HealthInsight[] {
  const insights: HealthInsight[] = [];

  if (avgSleep !== null) {
    const sleepHours = avgSleep / 60;
    let status: 'good' | 'attention' | 'concern' = 'good';
    let message = '';

    if (sleepHours < 6) {
      status = 'concern';
      message = 'Severely insufficient sleep. This significantly impacts health and recovery.';
    } else if (sleepHours < 7) {
      status = 'attention';
      message = 'Below recommended sleep duration. Aim for 7-9 hours nightly.';
    } else if (sleepHours <= 9) {
      status = 'good';
      message = 'Sleep duration is within the optimal range for adults.';
    } else {
      status = 'attention';
      message = 'Sleep duration is higher than typical. May indicate recovery needs or other factors.';
    }

    insights.push({
      metric: 'Average Sleep',
      status,
      value: `${sleepHours.toFixed(1)} hours`,
      message,
    });
  }

  if (avgSteps !== null) {
    let status: 'good' | 'attention' | 'concern' = 'good';
    let message = '';

    if (avgSteps < 5000) {
      status = 'concern';
      message = 'Activity level is sedentary. Increasing movement will benefit health significantly.';
    } else if (avgSteps < 7500) {
      status = 'attention';
      message = 'Activity level is low-average. Try to add more walking throughout the day.';
    } else if (avgSteps < 10000) {
      status = 'good';
      message = 'Activity level is good. Maintaining this consistently supports health.';
    } else {
      status = 'good';
      message = 'Excellent activity level. This supports cardiovascular and metabolic health.';
    }

    insights.push({
      metric: 'Daily Steps',
      status,
      value: Math.round(avgSteps).toLocaleString(),
      message,
    });
  }

  if (avgHrv !== null) {
    let status: 'good' | 'attention' | 'concern' = 'good';
    let message = '';

    if (avgHrv < 20) {
      status = 'concern';
      message = 'HRV indicates high stress or low recovery. Prioritize rest and stress management.';
    } else if (avgHrv < 40) {
      status = 'attention';
      message = 'HRV suggests moderate stress levels. Consider recovery-focused practices.';
    } else if (avgHrv < 70) {
      status = 'good';
      message = 'HRV indicates good autonomic balance and recovery capacity.';
    } else {
      status = 'good';
      message = 'Excellent HRV indicating strong parasympathetic tone and recovery.';
    }

    insights.push({
      metric: 'HRV',
      status,
      value: `${Math.round(avgHrv)} ms`,
      message,
    });
  }

  return insights;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const labPath = path.join(process.cwd(), 'DATA', 'lab_results.json');
  const unifiedPath = path.join(process.cwd(), 'data', 'unified', 'daily.json');

  let reports: LabReport[] = [];
  if (fs.existsSync(labPath)) {
    const data = JSON.parse(fs.readFileSync(labPath, 'utf-8'));
    reports = data.reports || [];
  }

  const testMap = new Map<string, TestTrend>();
  for (const report of reports) {
    for (const result of report.results) {
      if (typeof result.value !== 'number') continue;

      if (!testMap.has(result.standardizedName)) {
        testMap.set(result.standardizedName, {
          name: result.testName,
          standardizedName: result.standardizedName,
          unit: result.unit,
          category: result.category,
          referenceRange: result.referenceRange,
          history: [],
          latestValue: 0,
          latestStatus: 'normal',
        });
      }
      testMap.get(result.standardizedName)!.history.push({
        date: report.date,
        value: result.value,
        status: result.status,
      });
    }
  }

  const testTrends: TestTrend[] = [];
  for (const [, test] of testMap) {
    if (test.history.length < 1) continue;
    test.history.sort((a, b) => a.date.localeCompare(b.date));
    const latest = test.history[test.history.length - 1];
    test.latestValue = latest.value;
    test.latestStatus = latest.status;
    testTrends.push(test);
  }

  const abnormalTests = testTrends.filter((t) => t.latestStatus !== 'normal');

  let unifiedData: UnifiedDailyRecord[] = [];
  if (fs.existsSync(unifiedPath)) {
    const data = JSON.parse(fs.readFileSync(unifiedPath, 'utf-8'));
    unifiedData = data.data || [];
  }

  const recentData = unifiedData.slice(-90);

  const sleepValues = recentData
    .filter((d) => d.sleepDurationMinutes?.value)
    .map((d) => d.sleepDurationMinutes!.value);
  const avgSleep = sleepValues.length > 0
    ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length
    : null;

  const stepValues = recentData
    .filter((d) => d.steps?.value)
    .map((d) => d.steps!.value);
  const avgSteps = stepValues.length > 0
    ? stepValues.reduce((a, b) => a + b, 0) / stepValues.length
    : null;

  const hrvValues = recentData
    .filter((d) => d.hrv?.value)
    .map((d) => d.hrv!.value);
  const avgHrv = hrvValues.length > 0
    ? hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length
    : null;

  const recommendations = generateRecommendations(abnormalTests, avgSleep, avgSteps, avgHrv);
  const healthInsights = generateHealthInsights(avgSleep, avgSteps, avgHrv);

  const lastLabDate = reports.length > 0 ? reports[0].date : null;

  return {
    props: {
      recommendations,
      healthInsights,
      abnormalTests,
      lastLabDate,
      avgSleep,
      avgSteps,
      avgHrv,
    },
  };
};

export default function RecommendationsPage({
  recommendations,
  healthInsights,
  abnormalTests,
  lastLabDate,
  avgSleep,
  avgSteps,
  avgHrv,
}: Props) {
  const supplementRecs = recommendations.filter((r) => r.category === 'supplement');
  const lifestyleRecs = recommendations.filter((r) => r.category === 'lifestyle');
  const dietRecs = recommendations.filter((r) => r.category === 'diet');
  const monitoringRecs = recommendations.filter((r) => r.category === 'monitoring');

  const STATUS_COLORS = {
    good: 'bg-green-100 border-green-300 text-green-800',
    attention: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    concern: 'bg-red-100 border-red-300 text-red-800',
  };

  return (
    <div className="grow p-4">
      <Head>
        <title>Recommendations - Health Overview</title>
      </Head>

      <main className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Health Recommendations</h1>
          <p className="text-gray-500 text-sm">
            Personalized recommendations based on your lab results and health metrics
            {lastLabDate && ` • Last lab: ${lastLabDate}`}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Disclaimer:</strong> These recommendations are generated based on your data and general health guidelines.
            Always consult with a healthcare provider before starting any new supplements or making significant lifestyle changes.
          </p>
        </div>

        {healthInsights.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Health Metrics Summary (Last 90 Days)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {healthInsights.map((insight) => (
                <div
                  key={insight.metric}
                  className={`p-4 rounded-lg border-2 ${STATUS_COLORS[insight.status]}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{insight.metric}</h3>
                    <span className="text-lg font-semibold">{insight.value}</span>
                  </div>
                  <p className="text-sm opacity-80">{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {abnormalTests.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6">
            <h2 className="font-semibold text-orange-800 mb-3">
              Lab Values Requiring Attention ({abnormalTests.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {abnormalTests.map((test) => (
                <span
                  key={test.standardizedName}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    test.latestStatus === 'critical'
                      ? 'bg-red-200 text-red-800'
                      : test.latestStatus === 'high'
                      ? 'bg-orange-200 text-orange-800'
                      : 'bg-yellow-200 text-yellow-800'
                  }`}
                >
                  {test.name}: {test.latestValue} {test.unit} ({test.latestStatus})
                </span>
              ))}
            </div>
          </div>
        )}

        {supplementRecs.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>{CATEGORY_ICONS.supplement}</span>
              Supplement Recommendations ({supplementRecs.length})
            </h2>
            <div className="space-y-4">
              {supplementRecs.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-5 rounded-xl border-2 ${PRIORITY_COLORS[rec.priority]}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{rec.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_BADGE[rec.priority]}`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{rec.description}</p>
                  <p className="text-sm text-gray-600 mb-3 italic">{rec.rationale}</p>
                  {(rec.dosage || rec.timing) && (
                    <div className="bg-white bg-opacity-60 rounded-lg p-3 mt-3">
                      {rec.dosage && (
                        <p className="text-sm">
                          <strong>Suggested dosage:</strong> {rec.dosage}
                        </p>
                      )}
                      {rec.timing && (
                        <p className="text-sm">
                          <strong>Timing:</strong> {rec.timing}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {lifestyleRecs.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>{CATEGORY_ICONS.lifestyle}</span>
              Lifestyle Recommendations ({lifestyleRecs.length})
            </h2>
            <div className="space-y-4">
              {lifestyleRecs.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-5 rounded-xl border-2 ${PRIORITY_COLORS[rec.priority]}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{rec.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_BADGE[rec.priority]}`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{rec.description}</p>
                  <p className="text-sm text-gray-600 italic">{rec.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {monitoringRecs.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>{CATEGORY_ICONS.monitoring}</span>
              Monitoring Recommendations ({monitoringRecs.length})
            </h2>
            <div className="space-y-4">
              {monitoringRecs.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-5 rounded-xl border-2 ${PRIORITY_COLORS[rec.priority]}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{rec.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_BADGE[rec.priority]}`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{rec.description}</p>
                  <p className="text-sm text-gray-600 italic">{rec.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {dietRecs.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>{CATEGORY_ICONS.diet}</span>
              Diet Recommendations ({dietRecs.length})
            </h2>
            <div className="space-y-4">
              {dietRecs.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-5 rounded-xl border-2 ${PRIORITY_COLORS[rec.priority]}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{rec.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_BADGE[rec.priority]}`}>
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{rec.description}</p>
                  <p className="text-sm text-gray-600 italic">{rec.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-5 border">
          <h2 className="font-semibold text-gray-900 mb-3">General Health Foundation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium mb-2">Daily Essentials</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>7-9 hours quality sleep</li>
                <li>8,000+ steps daily</li>
                <li>Adequate hydration (2-3L water)</li>
                <li>Balanced whole-food diet</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Recommended Testing Frequency</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li>Complete blood panel: Annually</li>
                <li>Vitamin D: Every 6 months</li>
                <li>Lipid panel: Annually if normal</li>
                <li>Thyroid: As indicated</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
