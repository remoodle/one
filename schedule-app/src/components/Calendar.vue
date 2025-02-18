<script setup lang="ts">
import { watchEffect } from "vue";
import "@schedule-x/theme-default/dist/index.css";
import type { CalendarEvent } from "@schedule-x/calendar";
import { ScheduleXCalendar } from "@schedule-x/vue";
import { createEventRecurrencePlugin } from "@schedule-x/event-recurrence";
import { createEventModalPlugin } from "@schedule-x/event-modal";
import { createEventsServicePlugin } from "@schedule-x/event-recurrence";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import { createCalendar, createViewDay, createViewWeek } from "@schedule-x/calendar";
import { dayjs } from "@/lib/dayjs";

const props = defineProps<{
  events: CalendarEvent[];
  theme: "light" | "dark";
}>();

const minDate = dayjs()
  .weekday(0)
  .hour(0)
  .minute(0)
  .second(0)
  .millisecond(0)
  .format("YYYY-MM-DD")
  .toString();

const maxDate = dayjs()
  .weekday(6)
  .hour(23)
  .minute(59)
  .second(59)
  .millisecond(999)
  .format("YYYY-MM-DD")
  .toString();

const eventsServicePlugin = createEventsServicePlugin();

const calendarApp = createCalendar({
  views: [createViewWeek(), createViewDay()],
  plugins: [
    createEventRecurrencePlugin(),
    createEventModalPlugin(),
    createCurrentTimePlugin(),
    eventsServicePlugin,
  ],
  calendars: {
    online: {
      colorName: "blue",
      label: "Online",
      lightColors: {
        main: "#2196F3",
        container: "#BBDEFB",
        onContainer: "#0D47A1",
      },
      darkColors: {
        main: "#90CAF9",
        container: "#1E3A5F",
        onContainer: "#E3F2FD",
      },
    },
    offline: {
      colorName: "red",
      label: "Offline",
      lightColors: {
        main: "#F44336",
        container: "#FFCDD2",
        onContainer: "#B71C1C",
      },
      darkColors: {
        main: "#EF9A9A",
        container: "#4A2020",
        onContainer: "#FFEBEE",
      },
    },
    learn: {
      colorName: "green",
      label: "Learn",
      lightColors: {
        main: "#4CAF50",
        container: "#C8E6C9",
        onContainer: "#1B5E20",
      },
      darkColors: {
        main: "#A5D6A7",
        container: "#1C3A28",
        onContainer: "#E8F5E9",
      },
    },
  },
  events: props.events,
  locale: "en-GB",
  minDate: minDate,
  maxDate: maxDate,
  isResponsive: true,
  dayBoundaries: {
    start: "08:00",
    end: "22:00",
  },
  weekOptions: {
    gridHeight: 1050,
    nDays: 6,
  },
});

watchEffect(() => {
  calendarApp.setTheme(props.theme);
});

watchEffect(() => {
  eventsServicePlugin.set(props.events);
});
</script>

<template>
  <ScheduleXCalendar :calendar-app="calendarApp" />
</template>
