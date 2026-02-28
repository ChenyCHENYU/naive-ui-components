import { ref, computed, h } from "vue";
import { NTag, NButton, NPopconfirm, NSpace } from "naive-ui";
import C_Icon from "../../C_Icon/index.vue";
import { presetConfigs } from "../data";
import type {
  TreeOption,
  TreeNodeData,
  TreeProps,
  TreeExpose,
  DropInfo,
} from "../types";

type EmitFn = {
  (
    event: "node-select",
    node: TreeNodeData | null,
    selectedKeys: (string | number)[],
  ): void;
  (event: "node-action", action: string, node: TreeNodeData): void;
  (event: "node-drop", info: DropInfo): void;
  (event: "add", parentNode?: TreeNodeData): void;
  (event: "refresh"): void;
};

export function useTreeOperations(props: TreeProps, emit: EmitFn) {
  const internalSearchPattern = ref("");
  const expandedKeys = ref<(string | number)[]>(
    props.defaultExpandedKeys ?? [],
  );
  const selectedKeys = ref<(string | number)[]>(
    props.defaultSelectedKeys ?? [],
  );
  const isAllExpanded = ref(props.defaultExpandAll ?? false);

  const keyField = computed(() => props.keyField ?? "id");
  const labelField = computed(() => props.labelField ?? "name");
  const childrenField = computed(() => props.childrenField ?? "children");
  const iconField = computed(() => props.iconField ?? "icon");

  const mergedConfig = computed(() => {
    const preset = presetConfigs[props.mode ?? "custom"] || {};
    return {
      ...preset,
      ...props,
      iconConfig: { ...preset.iconConfig, ...props.iconConfig },
      actions: props.actions?.length ? props.actions : preset.actions || [],
    };
  });

  const treeData = computed((): TreeOption[] => props.data as TreeOption[]);

  const currentSearchPattern = computed(
    () => props.searchPattern || internalSearchPattern.value,
  );

  const selectedNode = computed((): TreeNodeData | null => {
    if (selectedKeys.value.length === 0) return null;
    const findNode = (
      nodes: TreeNodeData[],
      id: string | number,
    ): TreeNodeData | null => {
      for (const node of nodes) {
        if (node[keyField.value] === id) return node;
        if (node[childrenField.value]) {
          const found = findNode(node[childrenField.value], id);
          if (found) return found;
        }
      }
      return null;
    };
    return findNode(props.data, selectedKeys.value[0]);
  });

  const getAllKeys = (nodes: TreeNodeData[]): (string | number)[] => {
    const keys: (string | number)[] = [];
    nodes.forEach((node) => {
      keys.push(node[keyField.value]);
      if (node[childrenField.value]) {
        keys.push(...getAllKeys(node[childrenField.value]));
      }
    });
    return keys;
  };

  const getNodeIcon = (node: TreeNodeData): string => {
    const config = mergedConfig.value.iconConfig!;
    if (node[iconField.value]) return node[iconField.value];
    if (node.type && config.typeMap?.[node.type])
      return config.typeMap[node.type];
    return config.default || "mdi:circle-outline";
  };

  const getNodeIconColor = (node: TreeNodeData): string => {
    const config = mergedConfig.value.iconConfig!;
    if (node.type && config.colorMap?.[node.type])
      return config.colorMap[node.type];
    return "currentColor";
  };

  const renderPrefix = ({ option }: { option: TreeOption }) => {
    const node = option as TreeNodeData;
    return h(C_Icon, {
      name: getNodeIcon(node),
      size: 18,
      color: getNodeIconColor(node),
      class: "mr-3 flex-shrink-0",
    });
  };

  const renderLabel = ({ option }: { option: TreeOption }) => {
    const node = option as TreeNodeData;
    const statusTags =
      props.statusConfigs
        ?.map((config) => {
          const value = node[config.field];
          const statusConfig = config.values[value];
          if (!statusConfig?.text) return null;
          return h(
            NTag,
            {
              type: statusConfig.type,
              size: "small",
              class: "ml-2",
              style: { fontSize: "12px" },
            },
            { default: () => statusConfig.text },
          );
        })
        .filter(Boolean) || [];

    return h(
      "div",
      {
        class: "flex items-center flex-1 min-w-0 py-1",
        style: { lineHeight: "1.5" },
      },
      [
        h(
          "span",
          { class: "mr-3 font-medium text-sm" },
          node[labelField.value],
        ),
        ...statusTags,
      ],
    );
  };

  const renderSuffix = ({ option }: { option: TreeOption }) => {
    const node = option as TreeNodeData;
    const actions = mergedConfig.value.actions || [];

    const actionButtons = actions
      .filter((action) => !action.show || action.show(node))
      .map((action) => {
        const buttonProps = {
          size: "tiny" as const,
          type: action.type || ("default" as const),
          secondary: true,
          style: { padding: "4px 6px", minWidth: "24px", height: "24px" },
          onClick: (e: Event) => {
            e.stopPropagation();
            handleNodeAction(action.key, node);
          },
        };
        const iconEl = h(C_Icon, {
          name: action.icon,
          size: 12,
          title: action.text,
        });

        if (action.confirm) {
          return h(
            NPopconfirm,
            { onPositiveClick: () => handleNodeAction(action.key, node) },
            {
              trigger: () =>
                h(
                  NButton,
                  {
                    ...buttonProps,
                    onClick: (e: Event) => e.stopPropagation(),
                  },
                  { icon: () => iconEl },
                ),
              default: () => action.confirm,
            },
          );
        }
        return h(NButton, buttonProps, { icon: () => iconEl });
      });

    return h(
      "div",
      {
        class: "tree-actions",
        style: {
          display: "flex",
          alignItems: "center",
          marginLeft: "8px",
          opacity: "0",
          transition: "opacity 0.2s ease",
        },
      },
      [h(NSpace, { size: 4 }, { default: () => actionButtons })],
    );
  };

  const toggleExpandAll = (): void => {
    if (isAllExpanded.value) {
      expandedKeys.value = [];
      isAllExpanded.value = false;
    } else {
      expandedKeys.value = getAllKeys(props.data);
      isAllExpanded.value = true;
    }
  };

  const handleExpandedKeysChange = (keys: (string | number)[]): void => {
    expandedKeys.value = keys;
    isAllExpanded.value = keys.length === getAllKeys(props.data).length;
  };

  const handleSelectedKeysChange = (keys: (string | number)[]): void => {
    selectedKeys.value = keys;
    emit("node-select", selectedNode.value, keys);
  };

  const handleDrop = (info: DropInfo): void => emit("node-drop", info);

  const handleNodeAction = (action: string, node: TreeNodeData): void => {
    if (action === "add") {
      emit("add", node);
    } else {
      emit("node-action", action, node);
    }
  };

  const handleAdd = (): void => emit("add");
  const handleRefresh = (): void => emit("refresh");

  const expose: TreeExpose = {
    expandAll: () => {
      expandedKeys.value = getAllKeys(props.data);
      isAllExpanded.value = true;
    },
    collapseAll: () => {
      expandedKeys.value = [];
      isAllExpanded.value = false;
    },
    selectNode: (key: string | number) => {
      selectedKeys.value = [key];
    },
    getSelectedNode: () => selectedNode.value,
    expandedKeys,
    selectedKeys,
  };

  return {
    internalSearchPattern,
    expandedKeys,
    selectedKeys,
    isAllExpanded,
    treeData,
    currentSearchPattern,
    renderPrefix,
    renderLabel,
    renderSuffix,
    toggleExpandAll,
    handleExpandedKeysChange,
    handleSelectedKeysChange,
    handleDrop,
    handleAdd,
    handleRefresh,
    expose,
  };
}
