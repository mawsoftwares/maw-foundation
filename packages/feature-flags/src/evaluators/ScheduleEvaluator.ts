import { FeatureSchedule } from '../domain/types.js';

export class ScheduleEvaluator {
  evaluate(schedule: FeatureSchedule | undefined, currentTimeMs: number = Date.now()): boolean {
    if (!schedule) return true; // No schedule means always active

    const fromTime = new Date(schedule.enabledFrom).getTime();
    if (currentTimeMs < fromTime) {
      return false; // Not yet active
    }

    if (schedule.enabledUntil) {
      const untilTime = new Date(schedule.enabledUntil).getTime();
      if (currentTimeMs >= untilTime) {
        return false; // Expired
      }
    }

    return true; // Currently active
  }
}
