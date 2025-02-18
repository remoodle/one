<script lang="ts" setup>
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  <div class="flex justify-center">
    <div class="flex flex-col p-4">
      <div class="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
        <GroupSelect v-model="group" :all-groups />
        <div class="flex gap-2">
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
              <template v-if="group">
                <ScheduleSettings
                  class="max-w-xs"
                  v-model="filters[group]"
                  :group="group"
                  :courses="groupCourses"
                />
              </template>
            </DialogContent>
          </Dialog>
          <template v-if="group && filters[group]">
            <ExportToIcal :events="groupSchedule" :group :filters="filters[group]" />
          </template>
        </div>
      </div>

      <Calendar
        class="max-h-[90vh] h-[800px] w-[98vw] xl:w-[95vw]"
        :events="groupSchedule"
        :theme="appStore.theme"
      />
    </div>
  </div>
</template>
