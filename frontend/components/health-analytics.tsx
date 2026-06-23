import { Activity, AlertTriangle, BarChart3, Dumbbell, HeartPulse, LineChart, Target } from "lucide-react";

export type AnalyticsBodyMetric = {
  measured_on: string;
  weight_kg: number | string | null;
  waist_cm: number | string | null;
  body_fat_percent: number | string | null;
  skeletal_muscle_mass_kg: number | string | null;
};

export type AnalyticsWorkoutSet = {
  planned_weight_kg: number | string | null;
  actual_weight_kg: number | string | null;
  planned_reps: number | null;
  actual_reps: number | null;
  planned_duration_min: number | null;
  actual_duration_min: number | null;
  planned_distance_m: number | string | null;
  actual_distance_m: number | string | null;
  completed_at: string | null;
};

export type AnalyticsWorkoutExercise = {
  exercise_type: string;
  workout_sets: AnalyticsWorkoutSet[] | null;
};

export type AnalyticsWorkoutSession = {
  id: string;
  scheduled_at: string;
  status: string;
  session_type: string;
  overall_rpe: number | null;
  pain_score: number | null;
  duration_minutes: number | null;
  workout_exercises: AnalyticsWorkoutExercise[] | null;
};

export type AnalyticsPlan = {
  id: string;
  scheduled_date: string;
  status: string;
};

type HealthAnalyticsProps = {
  bodyMetrics: AnalyticsBodyMetric[];
  workouts: AnalyticsWorkoutSession[];
  plans: AnalyticsPlan[];
  today: string;
  weekStart: string;
};

type TrendPoint = {
  date: string;
  value: number;
};

type WeekBucket = {
  start: string;
  end: string;
  label: string;
  adherence: number | null;
  completedPlans: number;
  duePlans: number;
  setCompletion: number | null;
  completedSets: number;
  totalSets: number;
  volume: number;
  duration: number;
};

const typeLabels: Record<string, string> = {
  strength: "肌力",
  cardio: "心肺",
  running: "跑步",
  tennis: "網球",
  pilates: "皮拉提斯",
  other: "其他",
};

export function HealthAnalytics({ bodyMetrics, workouts, plans, today, weekStart }: HealthAnalyticsProps) {
  const bodyTrend = buildBodyTrend(bodyMetrics);
  const weeks = buildWeekBuckets({ plans, today, weekStart, workouts });
  const currentWeek = weeks[weeks.length - 1];
  const distribution = buildWorkoutDistribution(workouts);
  const risk = buildRecoveryRisk(workouts);
  const latestVolume = currentWeek?.volume || 0;
  const previousVolume = weeks.length > 1 ? weeks[weeks.length - 2].volume : 0;
  const volumeDelta = previousVolume > 0 ? ((latestVolume - previousVolume) / previousVolume) * 100 : null;

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center gap-2">
        <LineChart aria-hidden="true" className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">趨勢與完成度</h2>
          <p className="mt-1 text-sm text-muted-foreground">近 8 週身體變化、訓練執行與恢復訊號。</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <AnalyticsMetric
          icon={<Target className="h-4 w-4" />}
          label="本週計畫達成"
          value={currentWeek?.adherence == null ? "尚無到期計畫" : `${Math.round(currentWeek.adherence)}%`}
          detail={
            currentWeek
              ? `${currentWeek.completedPlans}/${currentWeek.duePlans} 個到期計畫`
              : "以排程計畫為分母"
          }
        />
        <AnalyticsMetric
          icon={<Dumbbell className="h-4 w-4" />}
          label="本週組數完成"
          value={currentWeek?.setCompletion == null ? "尚無組數" : `${Math.round(currentWeek.setCompletion)}%`}
          detail={
            currentWeek
              ? `${currentWeek.completedSets}/${currentWeek.totalSets} 組`
              : "以完成打勾為準"
          }
        />
        <AnalyticsMetric
          icon={<BarChart3 className="h-4 w-4" />}
          label="本週訓練量"
          value={latestVolume > 0 ? `${compactNumber(latestVolume)} kg` : "尚無訓練量"}
          detail={volumeDelta == null ? "需連續兩週資料" : `較上週 ${formatSignedPercent(volumeDelta)}`}
        />
        <AnalyticsMetric
          icon={<HeartPulse className="h-4 w-4" />}
          label="恢復警訊"
          value={risk.alerts === 0 ? "穩定" : `${risk.alerts} 筆`}
          detail={`RPE ${risk.avgRpe ?? "-"} / 疼痛 ${risk.avgPain ?? "-"}`}
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Activity aria-hidden="true" className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">身材紀錄趨勢</h3>
        </div>
        <div className="mt-3 space-y-3">
          <TrendCard label="體重" points={bodyTrend.weight} unit="kg" lowerIsBetter />
          <TrendCard label="腰圍" points={bodyTrend.waist} unit="cm" lowerIsBetter />
          <TrendCard label="體脂率" points={bodyTrend.bodyFat} unit="%" lowerIsBetter />
          <TrendCard label="骨骼肌量" points={bodyTrend.muscle} unit="kg" />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold">週完成率</h3>
        <p className="mt-1 text-sm text-muted-foreground">計畫達成看習慣，組數完成看實際執行細節。</p>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <WeeklyPercentChart label="計畫達成率" weeks={weeks} valueKey="adherence" />
          <WeeklyPercentChart label="組數完成率" weeks={weeks} valueKey="setCompletion" />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold">訓練量與運動事項</h3>
        <div className="mt-4">
          <VolumeChart weeks={weeks} />
        </div>
        <div className="mt-4 space-y-2">
          {distribution.length ? (
            distribution.map((item) => <DistributionRow item={item} key={item.type} />)
          ) : (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
              近 8 週尚無訓練項目可分析。
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">教練查看重點</h3>
        </div>
        <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
          {buildCoachNotes({ currentWeek, risk, volumeDelta }).map((note) => (
            <p className="rounded-md bg-muted p-3" key={note}>
              {note}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold">評估指標設計</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
          <Indicator label="身材成效" value="體重、腰圍、體脂率、骨骼肌量：用趨勢與變化量判斷方向，不用單日數字下結論。" />
          <Indicator label="每日達成" value="到期計畫達成率與組數完成率：分開看有沒有出席，以及實際組數是否完成。" />
          <Indicator label="訓練刺激" value="訓練量、時長、運動項目分布：確認課表負荷是否穩定累積，避免只看體重。" />
          <Indicator label="恢復風險" value="RPE、疼痛分數、疼痛備註：出現高疲勞或疼痛時，教練可調整強度或動作。" />
        </div>
      </section>
    </section>
  );
}

function AnalyticsMetric({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-28 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function TrendCard({
  label,
  lowerIsBetter = false,
  points,
  unit,
}: {
  label: string;
  lowerIsBetter?: boolean;
  points: TrendPoint[];
  unit: string;
}) {
  const first = points[0]?.value ?? null;
  const latest = points[points.length - 1]?.value ?? null;
  const delta = first != null && latest != null ? latest - first : null;
  const favorable = delta == null || delta === 0 ? null : lowerIsBetter ? delta < 0 : delta > 0;

  return (
    <div className="rounded-md bg-muted p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest == null ? "尚無資料" : `最新 ${formatValue(latest)} ${unit}`}
          </p>
        </div>
        <p className={`text-sm font-semibold ${favorable === false ? "text-foreground" : "text-primary"}`}>
          {delta == null ? "-" : `${delta > 0 ? "+" : ""}${formatValue(delta)} ${unit}`}
        </p>
      </div>
      <div className="mt-2">
        <Sparkline label={label} points={points} unit={unit} />
      </div>
    </div>
  );
}

function Sparkline({ label, points, unit }: { label: string; points: TrendPoint[]; unit: string }) {
  if (points.length < 2) {
    return <p className="rounded border border-dashed border-border p-3 text-xs text-muted-foreground">至少需要 2 筆紀錄才會形成趨勢線。</p>;
  }

  const width = 220;
  const height = 72;
  const padding = 8;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coordinates = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { x, y, point };
  });
  const polyline = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  return (
    <svg
      aria-label={`${label} 趨勢，${formatShortDate(points[0].date)} ${formatValue(points[0].value)} ${unit} 到 ${formatShortDate(points[points.length - 1].date)} ${formatValue(points[points.length - 1].value)} ${unit}`}
      className="h-20 w-full"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <line stroke="hsl(var(--border))" strokeWidth="1" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
      <polyline fill="none" points={polyline} stroke="hsl(var(--primary))" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {first ? <circle cx={first.x} cy={first.y} fill="hsl(var(--card))" r="3" stroke="hsl(var(--primary))" strokeWidth="2" /> : null}
      {last ? <circle cx={last.x} cy={last.y} fill="hsl(var(--primary))" r="4" /> : null}
    </svg>
  );
}

function WeeklyPercentChart({
  label,
  valueKey,
  weeks,
}: {
  label: string;
  valueKey: "adherence" | "setCompletion";
  weeks: WeekBucket[];
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex h-32 items-end gap-1">
        {weeks.map((week) => {
          const value = week[valueKey];
          const height = value == null ? 8 : Math.max(value, 6);
          return (
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1" key={`${label}-${week.start}`}>
              <div className="flex h-24 w-full items-end rounded bg-muted px-1">
                <div
                  aria-label={`${week.label} ${label} ${value == null ? "無資料" : `${Math.round(value)}%`}`}
                  className={`w-full rounded-sm ${value == null ? "border border-dashed border-border bg-card" : "bg-primary"}`}
                  role="img"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="truncate text-[10px] text-muted-foreground">{week.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VolumeChart({ weeks }: { weeks: WeekBucket[] }) {
  const maxVolume = Math.max(...weeks.map((week) => week.volume), 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">重量訓練量</p>
        <p className="text-xs text-muted-foreground">完成組數 x 重量 x 次數</p>
      </div>
      <div className="mt-2 flex h-32 items-end gap-1">
        {weeks.map((week) => {
          const height = maxVolume > 0 ? Math.max((week.volume / maxVolume) * 100, 6) : 8;
          return (
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1" key={`volume-${week.start}`}>
              <div className="flex h-24 w-full items-end rounded bg-muted px-1">
                <div
                  aria-label={`${week.label} 訓練量 ${Math.round(week.volume)} kg`}
                  className={week.volume > 0 ? "w-full rounded-sm bg-primary" : "w-full rounded-sm border border-dashed border-border bg-card"}
                  role="img"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="truncate text-[10px] text-muted-foreground">{week.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DistributionRow({ item }: { item: ReturnType<typeof buildWorkoutDistribution>[number] }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span>{typeLabels[item.type] || item.type}</span>
        <span className="text-muted-foreground">{item.count} 次</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${item.percent}%` }} />
      </div>
    </div>
  );
}

function Indicator({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="font-medium">{label}</p>
      <p className="mt-1 leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}

function buildBodyTrend(metrics: AnalyticsBodyMetric[]) {
  const ordered = [...metrics].sort((a, b) => a.measured_on.localeCompare(b.measured_on));

  return {
    weight: buildTrend(ordered, "weight_kg"),
    waist: buildTrend(ordered, "waist_cm"),
    bodyFat: buildTrend(ordered, "body_fat_percent"),
    muscle: buildTrend(ordered, "skeletal_muscle_mass_kg"),
  };
}

function buildTrend(metrics: AnalyticsBodyMetric[], key: keyof AnalyticsBodyMetric): TrendPoint[] {
  return metrics
    .map((metric) => ({ date: metric.measured_on, value: toNumber(metric[key]) }))
    .filter((point): point is TrendPoint => point.value != null);
}

function buildWeekBuckets({
  plans,
  today,
  weekStart,
  workouts,
}: {
  plans: AnalyticsPlan[];
  today: string;
  weekStart: string;
  workouts: AnalyticsWorkoutSession[];
}): WeekBucket[] {
  return Array.from({ length: 8 }, (_, index) => {
    const start = addDays(weekStart, (index - 7) * 7);
    const end = addDays(start, 6);
    const cutoff = end < today ? end : today;
    const weekPlans = plans.filter(
      (plan) => plan.scheduled_date >= start && plan.scheduled_date <= cutoff && plan.status !== "cancelled",
    );
    const duePlans = weekPlans.length;
    const completedPlans = weekPlans.filter((plan) => plan.status === "completed").length;
    const weekWorkouts = workouts.filter((workout) => {
      const day = workout.scheduled_at.slice(0, 10);
      return day >= start && day <= end && workout.status !== "draft";
    });
    const sets = weekWorkouts.flatMap((workout) =>
      (workout.workout_exercises || []).flatMap((exercise) => exercise.workout_sets || []),
    );
    const completedSets = sets.filter((set) => set.completed_at).length;
    const volume = sets.reduce((sum, set) => sum + getSetVolume(set), 0);
    const duration = weekWorkouts.reduce((sum, workout) => sum + (workout.duration_minutes || 0), 0);

    return {
      start,
      end,
      label: formatShortDate(start),
      adherence: duePlans > 0 ? (completedPlans / duePlans) * 100 : null,
      completedPlans,
      duePlans,
      setCompletion: sets.length > 0 ? (completedSets / sets.length) * 100 : null,
      completedSets,
      totalSets: sets.length,
      volume,
      duration,
    };
  });
}

function buildWorkoutDistribution(workouts: AnalyticsWorkoutSession[]) {
  const counts = workouts
    .filter((workout) => workout.status !== "draft")
    .reduce<Record<string, number>>((result, workout) => {
      result[workout.session_type] = (result[workout.session_type] || 0) + 1;
      return result;
    }, {});
  const max = Math.max(...Object.values(counts), 0);

  return Object.entries(counts)
    .map(([type, count]) => ({ type, count, percent: max > 0 ? (count / max) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

function buildRecoveryRisk(workouts: AnalyticsWorkoutSession[]) {
  const rpeValues = workouts.map((workout) => workout.overall_rpe).filter((value): value is number => value != null);
  const painValues = workouts.map((workout) => workout.pain_score).filter((value): value is number => value != null);
  const highRpe = rpeValues.filter((value) => value >= 9).length;
  const highPain = painValues.filter((value) => value >= 5).length;

  return {
    alerts: highRpe + highPain,
    avgRpe: average(rpeValues),
    avgPain: average(painValues),
  };
}

function buildCoachNotes({
  currentWeek,
  risk,
  volumeDelta,
}: {
  currentWeek: WeekBucket | undefined;
  risk: ReturnType<typeof buildRecoveryRisk>;
  volumeDelta: number | null;
}) {
  const notes: string[] = [];

  if (!currentWeek || currentWeek.duePlans === 0) {
    notes.push("本週尚無到期計畫，建議先排出 2 到 4 個可追蹤訓練日。");
  } else if ((currentWeek.adherence || 0) < 70) {
    notes.push("計畫達成率低於 70%，優先檢查排程是否太滿、時段是否固定，以及是否需要降低單次訓練門檻。");
  } else {
    notes.push("本週計畫達成率穩定，可用組數完成率判斷課表是否需要增加或維持。");
  }

  if (risk.alerts > 0) {
    notes.push("近 8 週有高 RPE 或疼痛紀錄，教練應檢查動作、總量與恢復日安排。");
  } else {
    notes.push("目前高疲勞與疼痛訊號不多，可持續觀察訓練量是否平穩增加。");
  }

  if (volumeDelta != null && volumeDelta > 30) {
    notes.push("本週重量訓練量較上週增加超過 30%，建議搭配 RPE 與疼痛分數確認恢復狀態。");
  } else if (volumeDelta != null && volumeDelta < -30) {
    notes.push("本週重量訓練量較上週下降超過 30%，建議確認是否因行程、疲勞或疼痛造成。");
  }

  return notes;
}

function getSetVolume(set: AnalyticsWorkoutSet) {
  if (!set.completed_at) {
    return 0;
  }

  const weight = toNumber(set.actual_weight_kg) ?? toNumber(set.planned_weight_kg);
  const reps = set.actual_reps ?? set.planned_reps;

  if (weight == null || reps == null) {
    return 0;
  }

  return weight * reps;
}

function toNumber(value: number | string | null | undefined) {
  if (value == null) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return formatValue(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function compactNumber(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value));
}

function formatValue(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${Math.round(value)}%`;
}

function formatShortDate(date: string) {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
