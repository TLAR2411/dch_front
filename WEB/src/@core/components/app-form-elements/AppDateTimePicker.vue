<script setup>
import FlatPickr from "vue-flatpickr-component";
import { useTheme } from "vuetify";
import { VField, makeVFieldProps } from "vuetify/lib/components/VField/VField";
import { VInput, makeVInputProps } from "vuetify/lib/components/VInput/VInput";

import { filterInputAttrs } from "vuetify/lib/util/helpers";
import { useConfigStore } from "@core/stores/config";
import { Khmer } from "flatpickr/dist/l10n/km.js";

const props = defineProps({
  autofocus: Boolean,
  counter: [Boolean, Number, String],
  counterValue: Function,
  prefix: String,
  placeholder: String,
  persistentPlaceholder: Boolean,
  persistentCounter: Boolean,
  suffix: String,
  type: {
    type: String,
    default: "text",
  },
  modelModifiers: Object,
  locale: {
    type: String,
    default: "default",
  },

  modelValue: {
    type: [String, Number, Date],
    default: "",
  },

  ...makeVInputProps({
    density: "comfortable",
    hideDetails: "auto",
  }),

  ...makeVFieldProps({
    variant: "outlined",
    color: "primary",
  }),
});

const emit = defineEmits([
  "click:control",
  "mousedown:control",
  "update:focused",
  "update:modelValue",
  "click:clear",
]);

defineOptions({
  inheritAttrs: false,
});

const configStore = useConfigStore();
const attrs = useAttrs();

const [rootAttrs, compAttrs] = filterInputAttrs(attrs);

const inputProps = ref(VInput.filterProps(props));
const fieldProps = ref(VField.filterProps(props));

const refFlatPicker = ref();

const { focused } = useFocus(refFlatPicker);

const isCalendarOpen = ref(false);
const isInlinePicker = ref(false);

// Inline picker support
if (compAttrs.config && compAttrs.config.inline) {
  isInlinePicker.value = compAttrs.config.inline;

  Object.assign(compAttrs, {
    altInputClass: "inlinePicker",
  });
}

// Detect time-only picker
const isTimeOnlyPicker =
  compAttrs.config?.enableTime && compAttrs.config?.noCalendar;

// Final Flatpickr config
compAttrs.config = {
  ...compAttrs.config,

  disableMobile: true,

  ...(isTimeOnlyPicker
    ? {
        // TIME PICKER
        dateFormat: "H:i",
        altInput: false,
      }
    : {
        // DATE PICKER
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "d-m-Y",
      }),

  locale: {
    // ...Khmer,
    firstDayOfWeek: 1,
  },

  prevArrow:
    '<i class="tabler-chevron-left v-icon" style="font-size:20px;"></i>',

  nextArrow:
    '<i class="tabler-chevron-right v-icon" style="font-size:20px;"></i>',
};

const onClear = (el) => {
  el.stopPropagation();

  nextTick(() => {
    emit("update:modelValue", "");
    emit("click:clear", el);
  });
};

const vuetifyTheme = useTheme();

const vuetifyThemesName = Object.keys(vuetifyTheme.themes.value);

const updateThemeClassInCalendar = () => {
  if (!refFlatPicker.value?.fp?.calendarContainer) return;

  vuetifyThemesName.forEach((t) => {
    refFlatPicker.value.fp.calendarContainer.classList.remove(`v-theme--${t}`);
  });

  refFlatPicker.value.fp.calendarContainer.classList.add(
    `v-theme--${vuetifyTheme.global.name.value}`,
  );
};

watch(() => configStore.theme, updateThemeClassInCalendar);

onMounted(() => {
  updateThemeClassInCalendar();

  nextTick(() => {
    const fp = refFlatPicker.value?.fp;

    const input = fp?.altInput || fp?.input;

    if (!input) return;

    // Better mobile keyboard
    input.setAttribute("inputmode", isTimeOnlyPicker ? "decimal" : "numeric");

    // Skip formatting for time picker
    if (isTimeOnlyPicker) return;

    // Auto format DD-MM-YYYY
    input.addEventListener("input", (e) => {
      let v = e.target.value.replace(/\D/g, "").slice(0, 8);

      if (v.length >= 5) {
        v = `${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4)}`;
      } else if (v.length >= 3) {
        v = `${v.slice(0, 2)}-${v.slice(2)}`;
      }

      e.target.value = v;
    });
  });
});

const emitModelValue = (val) => {
  emit("update:modelValue", val);
};

watch(
  () => props,
  () => {
    fieldProps.value = VField.filterProps(props);
    inputProps.value = VInput.filterProps(props);
  },
  {
    deep: true,
    immediate: true,
  },
);

const elementId = computed(() => {
  const _elementIdToken =
    fieldProps.value.id || fieldProps.value.label || inputProps.value.id;

  const _id = useId();

  return _elementIdToken ? `app-picker-field-${_elementIdToken}` : _id;
});
</script>

<template>
  <div class="app-picker-field">
    <VLabel
      v-if="fieldProps.label"
      class="mb-1 text-wrap notasans font-size-0-75 pt-2"
      style="line-height: 15px"
      :for="elementId"
      :text="$t(fieldProps.label)"
    />

    <VInput
      v-bind="{ ...inputProps, ...rootAttrs }"
      :model-value="modelValue"
      :class="[
        {
          'v-text-field--prefixed': props.prefix,
          'v-text-field--suffixed': props.suffix,
          'v-text-field--flush-details': ['plain', 'underlined'].includes(
            props.variant,
          ),
        },
        props.class,
      ]"
      class="position-relative v-text-field"
      :style="props.style"
    >
      <template
        #default="{ id, isDirty, isValid, isDisabled, isReadonly, validate }"
      >
        <VField
          v-bind="{ ...fieldProps, label: undefined }"
          :id="id.value"
          role="textbox"
          :active="focused || isDirty.value || isCalendarOpen"
          :focused="focused || isCalendarOpen"
          :dirty="isDirty.value || props.dirty"
          :error="isValid.value === false"
          :disabled="isDisabled.value"
          @click:clear="onClear"
          clear-icon="tabler-x"
          :prepend-inner-icon="
            isTimeOnlyPicker ? 'tabler-clock' : 'tabler-calendar-due'
          "
        >
          <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps || {}" />
          </template>

          <template #default="{ props: vFieldProps }">
            <div v-bind="vFieldProps">
              <FlatPickr
                v-if="!isInlinePicker"
                v-bind="compAttrs"
                ref="refFlatPicker"
                :model-value="modelValue"
                :readonly="isReadonly.value"
                :placeholder="isTimeOnlyPicker ? 'HH:mm' : 'DD-MM-YYYY'"
                class="flat-picker-custom-style h-100 w-100"
                :disabled="isReadonly.value"
                :inputmode="isTimeOnlyPicker ? 'decimal' : 'numeric'"
                @on-open="isCalendarOpen = true"
                @on-close="
                  isCalendarOpen = false;
                  validate();
                "
                @update:model-value="emitModelValue"
              />

              <input
                v-if="isInlinePicker"
                :value="modelValue"
                :placeholder="props.placeholder"
                :readonly="isReadonly.value"
                class="flat-picker-custom-style h-100 w-100"
                type="text"
              />
            </div>
          </template>
        </VField>
      </template>
    </VInput>

    <FlatPickr
      v-if="isInlinePicker"
      v-bind="compAttrs"
      ref="refFlatPicker"
      :model-value="modelValue"
      @update:model-value="emitModelValue"
      @on-open="isCalendarOpen = true"
      @on-close="isCalendarOpen = false"
    />
  </div>
</template>

<style lang="scss">
@use "flatpickr/dist/flatpickr.css";

.flat-picker-custom-style {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  outline: none;
  padding-inline: var(--v-field-padding-start);
  color: inherit;
  background: transparent;
}

input[altinputclass="inlinePicker"] {
  display: none;
}

.flatpickr-calendar {
  z-index: 9999 !important;
}

.flatpickr-day.selected {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
}

.flatpickr-day.today:not(.selected) {
  background: rgba(var(--v-theme-primary), 0.2);
  border: none;
}

.flatpickr-time input {
  font-size: 14px;
}
</style>
