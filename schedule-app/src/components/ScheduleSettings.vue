<script setup lang="ts">
import type { ScheduleFilter } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const props = defineProps<{
  group: string;
  courses: string[];
}>();

const filters = defineModel<ScheduleFilter>({ required: true });
</script>

<template>
  <div class="flex flex-col space-y-3">
    <section class="flex flex-col space-y-2">
      <span>Toggle event types</span>

      <div class="flex flex-wrap gap-2">
        <Badge
          :variant="filters.eventTypes.lecture ? 'default' : 'destructive'"
          class="cursor-pointer"
          @click="filters.eventTypes.lecture = !filters.eventTypes.lecture"
        >
          Lecture
        </Badge>
        <Badge
          :variant="filters.eventTypes.practice ? 'default' : 'destructive'"
          class="cursor-pointer"
          @click="filters.eventTypes.practice = !filters.eventTypes.practice"
        >
          Practice
        </Badge>
        <Badge
          :variant="filters.eventTypes.learn ? 'default' : 'destructive'"
          class="cursor-pointer"
          @click="filters.eventTypes.learn = !filters.eventTypes.learn"
        >
          Learn
        </Badge>
      </div>
    </section>

    <section class="flex flex-col space-y-2">
      <span>Toggle event formats</span>

      <div class="flex flex-wrap gap-2">
        <Badge
          :variant="filters.eventFormats.online ? 'default' : 'destructive'"
          class="cursor-pointer"
          @click="filters.eventFormats.online = !filters.eventFormats.online"
        >
          Online
        </Badge>
        <Badge
          :variant="filters.eventFormats.offline ? 'default' : 'destructive'"
          class="cursor-pointer"
          @click="filters.eventFormats.offline = !filters.eventFormats.offline"
        >
          Offline
        </Badge>
      </div>
    </section>

    <section class="flex flex-col space-y-2">
      <span>Toggle courses</span>

      <div class="flex flex-wrap gap-2">
        <Badge
          v-for="course in props.courses"
          :key="course"
          :variant="!filters.excludedCourses.includes(course) ? 'default' : 'destructive'"
          class="cursor-pointer"
          @click="
            filters.excludedCourses.includes(course)
              ? (filters.excludedCourses = filters.excludedCourses.filter((c) => c !== course))
              : filters.excludedCourses.push(course)
          "
        >
          {{ course }}
        </Badge>
      </div>
    </section>
  </div>
</template>
