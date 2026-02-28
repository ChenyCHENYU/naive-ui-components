import { ref } from "vue";
import { getItem, setItem } from "../../../utils/storage";
import type { Ref } from "vue";
import type { SearchFormItem, SearchFormParams } from "../types";

export interface SearchHistoryOptions {
  storageKey?: string;
  maxItems?: number;
}

export function useSearchHistory(
  fields: Ref<SearchFormItem[]>,
  formParams: Ref<SearchFormParams>,
  options: SearchHistoryOptions = {},
) {
  const { storageKey, maxItems = 5 } = options;
  const enabled = !!storageKey;

  const findField = (prop: string) =>
    fields.value.find((item) => item.prop === prop);

  const persistToStorage = () => {
    if (enabled) setItem(storageKey!, fields.value);
  };

  const restoreFromStorage = () => {
    if (!enabled) return;
    const stored = getItem<SearchFormItem[]>(storageKey!);
    if (!stored) return;
    stored.forEach((storedItem) => {
      const field = findField(storedItem.prop);
      if (field && storedItem.hisList) {
        field.hisList = storedItem.hisList;
      }
    });
  };

  const setAllFieldsFocus = (targetProp?: string) => {
    fields.value.forEach((item) => {
      item.isFocus = !!(item.hisList && item.prop === targetProp);
    });
  };

  const handleFocus = (prop: string) => {
    restoreFromStorage();
    setAllFieldsFocus(prop);
  };

  const closeAllPanels = () => setAllFieldsFocus();

  const selectHistoryItem = (value: string, prop: string) => {
    formParams.value[prop] = value;
    closeAllPanels();
  };

  const deleteHistoryItem = (prop: string, index: number) => {
    const field = findField(prop);
    if (!field?.hisList) return;
    field.hisList.splice(index, 1);
    if (field.hisList.length === 0) field.isFocus = false;
    persistToStorage();
  };

  const clearAllHistory = (prop: string) => {
    const field = findField(prop);
    if (!field?.hisList) return;
    field.hisList = [];
    field.isFocus = false;
    persistToStorage();
  };

  const pushToHistoryList = (hisList: string[], newValue: string) => {
    const idx = hisList.indexOf(newValue);
    if (idx > -1) hisList.splice(idx, 1);
    hisList.unshift(newValue);
    if (hisList.length > maxItems) hisList.length = maxItems;
    return hisList;
  };

  const saveCurrentInputs = () => {
    if (!enabled) return;
    Object.keys(formParams.value).forEach((key) => {
      const val = formParams.value[key];
      if (!val) return;
      const field = findField(key);
      if (!field?.hisList) return;
      const str = String(val).trim();
      if (str) pushToHistoryList(field.hisList, str);
    });
    closeAllPanels();
    persistToStorage();
  };

  return {
    enabled,
    handleFocus,
    closeAllPanels,
    selectHistoryItem,
    deleteHistoryItem,
    clearAllHistory,
    saveCurrentInputs,
    restoreFromStorage,
  };
}
