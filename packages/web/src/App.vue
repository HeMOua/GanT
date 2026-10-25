<script setup lang="ts">
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NGlobalStyle,
  zhCN,
  dateZhCN,
  type GlobalThemeOverrides,
} from "naive-ui";
import { RouterView } from "vue-router";
import "./styles/workspace.css";
const theme: GlobalThemeOverrides = {
  common: {
    primaryColor: "#3567d6",
    primaryColorHover: "#4778e4",
    primaryColorPressed: "#2856bc",
    borderRadius: "6px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    textColorBase: "#24344d",
    successColor: "#1f8a70",
  },
  Button: { fontWeight: "500" },
  Card: { borderRadius: "10px" },
};
</script>
<template>
  <NConfigProvider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="theme"
  >
    <NGlobalStyle />
    <NDialogProvider
      ><NMessageProvider><RouterView /></NMessageProvider
    ></NDialogProvider>
  </NConfigProvider>
</template>
