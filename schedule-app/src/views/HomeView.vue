<script lang="ts" setup>
import { storeToRefs } from "pinia";
import { useSchedule } from "@/composables/use-schedule";
import { useAppStore } from "@/stores/app";
import Calendar from "@/components/Calendar.vue";
import GroupSelect from "@/components/GroupSelect.vue";
import ScheduleSettings from "@/components/ScheduleSettings.vue";
import ExportToIcal from "@/components/ExportToIcal.vue";
import parsedSchedule from "@/assets/3_2.json";

const appStore = useAppStore();

const { group, filters } = storeToRefs(appStore);

const { groupSchedule, allGroups, groupCourses } = useSchedule(
  () => group.value,
  () => filters.value,
  parsedSchedule,
);
</script>

<template>
  <div class="flex items-center p-4 flex-wrap space-x-3 space-y-4">
    <div class="flex flex-col gap-x-2 gap-y-8 p-5">
      <div class="flex flex-col gap-y-4">
        <GroupSelect v-model="group" :all-groups />
        <template v-if="group">
          <ScheduleSettings
            class="max-w-xs"
            v-model="filters[group]"
            :group="group"
            :courses="groupCourses"
          />
        </template>
      </div>
      <template v-if="group">
        <ExportToIcal :events="groupSchedule" :group :filters="filters[group]" />
      </template>
    </div>
    <div class="flex items-center justify-between gap-2 mx-auto">
      <Calendar
        class="max-h-[90vh] h-[800px] w-[1000px] max-w-[100vw]"
        :events="groupSchedule"
        :theme="appStore.theme"
      />
    </div>
  </div>
</template>
