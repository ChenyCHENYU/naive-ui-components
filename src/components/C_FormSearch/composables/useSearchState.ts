import { ref, computed, onMounted } from "vue";
import { useMessage } from "naive-ui";
import type { Ref } from "vue";
import type { SearchFormItem, SearchFormParams, SearchConfig } from "../types";
import {
  useSearchHistory,
  type SearchHistoryOptions,
} from "./useSearchHistory";

interface UseSearchStateOptions {
  formItemList: SearchFormItem[];
  formParams: SearchFormParams;
  config?: SearchConfig;
  historyOptions?: SearchHistoryOptions;
}

export function useSearchState(
  emits: {
    (event: "search", params: SearchFormParams): void;
    (event: "reset"): void;
    (event: "change-params", params: SearchFormParams): void;
  },
  options: UseSearchStateOptions,
) {
  const message = useMessage();
  const formRef = ref<any>(null);

  const foldThreshold = options.config?.foldThreshold ?? 7;
  const requireValue = options.config?.requireValue ?? true;

  const fields = ref<SearchFormItem[]>([...options.formItemList]);
  const formParams = ref<SearchFormParams>({ ...options.formParams });
  const expanded = ref(false);
  const searching = ref(false);

  const history = useSearchHistory(fields, formParams, options.historyOptions);

  const visibleFields = computed(() =>
    fields.value.filter((item) => item.show !== false),
  );

  const hasExpandButton = computed(() => fields.value.length > foldThreshold);

  const isEmpty = (value: any): boolean =>
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  const initialize = () => {
    fields.value.forEach((item, index) => {
      item.isFocus = false;
      if (index >= foldThreshold && item.show === undefined) {
        item.show = false;
      }
      if (item.type === "select") {
        if (!item.placeholder) item.placeholder = "请选择";
        if (formParams.value[item.prop] === undefined) {
          formParams.value[item.prop] = null;
        }
      }
    });
  };

  const searchFn = () => {
    if (requireValue) {
      const hasValidParams = Object.entries(formParams.value)
        .filter(([key]) => key !== "pageNum" && key !== "pageSize")
        .some(([, value]) => !isEmpty(value));

      if (!hasValidParams) {
        message.warning("请输入搜索内容，或选择筛选条件");
        return;
      }
    }
    history.saveCurrentInputs();
    emits("search", formParams.value);
  };

  const resetFn = () => {
    formRef.value?.restoreValidation();
    Object.keys(formParams.value).forEach((key) => {
      if (key !== "pageNum" && key !== "pageSize") {
        formParams.value[key] = null;
      }
    });
    emits("change-params", formParams.value);
    emits("reset");
  };

  const toggleFold = () => {
    expanded.value = !expanded.value;
    fields.value.forEach((item, index) => {
      if (index >= foldThreshold) item.show = expanded.value;
    });
  };

  const syncFromProps = (
    newItems: SearchFormItem[],
    newParams: SearchFormParams,
  ) => {
    fields.value = [...newItems];
    formParams.value = { ...newParams };
    initialize();
  };

  onMounted(() => {
    initialize();
    history.restoreFromStorage();
  });

  return {
    formRef,
    fields,
    formParams,
    expanded,
    searching,
    visibleFields,
    hasExpandButton,
    history,
    searchFn,
    resetFn,
    toggleFold,
    syncFromProps,
  };
}
