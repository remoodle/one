<script lang="ts" setup>
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { storeToRefs } from "pinia";
import { computed, watchEffect } from "vue";
import { useSchedule } from "@/composables/use-schedule";
import { useAppStore } from "@/stores/app";
import Calendar from "@/components/Calendar.vue";
import GroupSelect from "@/components/GroupSelect.vue";
import ScheduleSettings from "@/components/ScheduleSettings.vue";
import ExportToIcal from "@/components/ExportToIcal.vue";
import parsedSchedule from "@/assets/3_2.json";
import type { ScheduleFilter } from "@/lib/types";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";

const appStore = useAppStore();

const { group, filters } = storeToRefs(appStore);

const unwrappedFilters = computed<Record<string, ScheduleFilter>>(() => filters.value);

const { groupSchedule, allGroups, groupCourses } = useSchedule(
  () => group.value,
  () => unwrappedFilters.value,
  parsedSchedule,
);

watchEffect(() => {
  if (!allGroups.value.includes(group.value)) {
    group.value = "";
  }
});
</script>

<template>
  <div class="flex justify-center">
    <div class="flex flex-col p-4">
      <div class="flex flex-col md:flex-row justify-between items-start gap-4 mb-4 px-1">
        <GroupSelect v-model="group" :all-groups />
        <div class="flex gap-2">
          <ThemeSwitcher class="flex-none" />
          <Dialog>
            <DialogTrigger>
              <Button variant="default" class="cursor-pointer">Filters</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change filters for group {{ group }}</DialogTitle>
                <DialogDescription>
                  You can make changes to your schedule here. Click on any option to change its
                  value.
                </DialogDescription>
              </DialogHeader>
              <template v-if="group && unwrappedFilters && unwrappedFilters[group]">
                <ScheduleSettings
                  class="max-w-xs"
                  v-model="unwrappedFilters[group]"
                  :group="group"
                  :courses="groupCourses"
                />
              </template>
            </DialogContent>
          </Dialog>
          <template v-if="group && unwrappedFilters && unwrappedFilters[group]">
            <ExportToIcal
              :events="groupSchedule"
              :group="group"
              :filters="unwrappedFilters[group]"
            />
          </template>
        </div>
      </div>

      <Calendar
        class="max-h-[90vh] h-[80vh] w-[98vw] xl:w-[95vw] px-1"
        :events="groupSchedule"
        :theme="appStore.theme"
      />
    </div>
  </div>
</template>
