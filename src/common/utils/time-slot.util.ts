/**
 * TimeSlotUtil
 * ------------
 * Handles all time-slot arithmetic for the salon booking system.
 *
 * Rules:
 *  - Working hours: 09:00 – 20:00
 *  - Break period:  12:00 – 14:00 (no appointment may START or OVERLAP this window)
 *  - Slot granularity: 15 minutes
 *  - An appointment cannot start if its end time would exceed working hours
 *  - An appointment cannot start during break or cause overlap into break
 */

import { log } from "console";
import { TIME_SLOT } from "../constants/time.util";

export interface TimeRange {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export class TimeSlotUtil {
  static readonly WORK_START = TIME_SLOT.WORK_START;
  static readonly WORK_END = TIME_SLOT.WORK_END;
  static readonly BREAK_START = TIME_SLOT.BREAK_START;
  static readonly BREAK_END = TIME_SLOT.BREAK_END;
  static readonly SLOT_INTERVAL_MINUTES = TIME_SLOT.SLOT_INTERVAL_MINUTES;

  /** Convert "HH:MM" to total minutes since midnight */
  static toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  /** Convert minutes since midnight back to "HH:MM" */
  static fromMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** Calculate end time given a start time and duration in minutes */
  static calcEndTime(startTime: string, durationMinutes: number): string {
    return this.fromMinutes(this.toMinutes(startTime) + durationMinutes);
  }

  /**
   * Check whether a proposed [start, end) window overlaps the break period.
   * An appointment that ends exactly at 12:00 is fine.
   * An appointment that starts exactly at 14:00 is fine.
   */
  static overlapsBreak(startTime: string, endTime: string): boolean {
    const start = this.toMinutes(startTime);
    const end = this.toMinutes(endTime);
    const breakStart = this.toMinutes(this.BREAK_START);
    const breakEnd = this.toMinutes(this.BREAK_END);
    return start < breakEnd && end > breakStart;
  }

  /** Check whether a time window fits within working hours */
  static withinWorkingHours(startTime: string, endTime: string): boolean {
    const start = this.toMinutes(startTime);
    const end = this.toMinutes(endTime);
    return (
      start >= this.toMinutes(this.WORK_START) &&
      end <= this.toMinutes(this.WORK_END)
    );
  }

  /**
   * Check whether two time ranges overlap.
   * Uses half-open intervals: [start, end)
   */
  static rangesOverlap(a: TimeRange, b: TimeRange): boolean {
    const aStart = this.toMinutes(a.startTime);
    const aEnd = this.toMinutes(a.endTime);
    const bStart = this.toMinutes(b.startTime);
    const bEnd = this.toMinutes(b.endTime);
    return aStart < bEnd && aEnd > bStart;
  }

  /**
   * Generate all valid start slots for a given duration on a given date,
   * excluding booked slots and the break period.
   *
   * @param durationMinutes  - service duration
   * @param bookedRanges     - already booked [startTime, endTime) on that date
   * @returns array of available "HH:MM" start times
   */
  static getAvailableSlots(
    durationMinutes: number,
    bookedRanges: TimeRange[],
  ): string[] {
    const available: string[] = [];
    const workStart = this.toMinutes(this.WORK_START);
    const workEnd = this.toMinutes(this.WORK_END);

    for (
      let current = workStart;
      current + durationMinutes <= workEnd;
      current += durationMinutes
    ) {
      
      const startTime = this.fromMinutes(current);
      const endTime = this.fromMinutes(current + durationMinutes);
      // Skip if overlaps break
      if (this.overlapsBreak(startTime, endTime)) continue;

      // Skip if overlaps any existing booking
      const hasConflict = bookedRanges.some((booked) =>
        this.rangesOverlap({ startTime, endTime }, booked),
      );
      if (hasConflict) continue;

      available.push(startTime);
    }

    return available;
  }

  /**
   * Validate a specific slot choice against all constraints.
   * Returns an error message string or null if valid.
   */
  static validateSlot(
    startTime: string,
    durationMinutes: number,
    bookedRanges: TimeRange[],
  ): string | null {
    const endTime = this.calcEndTime(startTime, durationMinutes);

    if (!this.withinWorkingHours(startTime, endTime)) {
      return `Appointment must be within working hours (${this.WORK_START} – ${this.WORK_END})`;
    }

    if (this.overlapsBreak(startTime, endTime)) {
      return `Appointment cannot overlap the break period (${this.BREAK_START} – ${this.BREAK_END})`;
    }

    const conflict = bookedRanges.find((booked) =>
      this.rangesOverlap({ startTime, endTime }, booked),
    );
    if (conflict) {
      return `Time slot conflicts with an existing appointment (${conflict.startTime} – ${conflict.endTime})`;
    }

    return null;
  }
}