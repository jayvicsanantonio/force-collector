import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { Button } from "../../../src/components/Button";
import { useAuth } from "../../../src/auth/AuthProvider";
import {
  applyImportPreview,
  buildExportPayload,
  buildImportPreview,
  exportPayloadToContent,
  parseImportRows,
  type ExportFormat,
  type ImportAction,
  type ImportPreview,
} from "../../../src/data-transfer";
import { track } from "../../../src/observability";

function actionTone(action: ImportAction) {
  if (action === "update_existing") {
    return "text-cyan-300";
  }
  if (action === "create_with_figure") {
    return "text-emerald-300";
  }
  if (action === "create_custom") {
    return "text-amber-300";
  }
  return "text-rose-300";
}

function actionLabel(action: ImportAction) {
  if (action === "update_existing") {
    return "Update";
  }
  if (action === "create_with_figure") {
    return "Create";
  }
  if (action === "create_custom") {
    return "Custom";
  }
  return "Skip";
}

export default function DataExportImportScreen() {
  const { user } = useAuth();
  const [busyExport, setBusyExport] = useState<ExportFormat | null>(null);
  const [buildingPreview, setBuildingPreview] = useState(false);
  const [applyingImport, setApplyingImport] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionableCount = useMemo(
    () => preview?.rows.filter((row) => row.action !== "skip").length ?? 0,
    [preview]
  );

  async function handleExport(format: ExportFormat) {
    if (!user?.id) {
      setError("You must be signed in to export data.");
      return;
    }

    setError(null);
    setNotice(null);
    setBusyExport(format);

    try {
      const payload = await buildExportPayload(user.id);
      const content = exportPayloadToContent(payload, format);

      const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!directory) {
        throw new Error("No writable directory is available on this device.");
      }

      const datePart = new Date().toISOString().slice(0, 10);
      const uri = `${directory}force-collector-export-${datePart}.${format}`;
      await FileSystem.writeAsStringAsync(uri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        throw new Error("Share sheet is unavailable on this platform.");
      }

      await Sharing.shareAsync(uri, {
        mimeType: format === "json" ? "application/json" : "text/csv",
        dialogTitle: `Export collection as ${format.toUpperCase()}`,
      });

      setNotice(
        `Export complete: ${payload.items.length} entries prepared as ${format.toUpperCase()}.`
      );
      track("profile_data_exported", { format, count: payload.items.length });
    } catch (exportError) {
      setError(
        exportError instanceof Error ? exportError.message : "Export failed."
      );
    } finally {
      setBusyExport(null);
    }
  }

  async function handlePickImportFile() {
    if (!user?.id) {
      setError("You must be signed in to import data.");
      return;
    }

    setError(null);
    setNotice(null);
    setBuildingPreview(true);
    setPreview(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/json",
          "text/csv",
          "text/comma-separated-values",
          "public.comma-separated-values-text",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setBuildingPreview(false);
        return;
      }

      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const rows = parseImportRows(content, asset.mimeType ?? asset.name ?? asset.uri);
      if (!rows.length) {
        throw new Error("Selected file contains no import rows.");
      }

      const nextPreview = await buildImportPreview(user.id, rows);
      setPreview(nextPreview);
      setSelectedFileName(asset.name ?? "import-file");
      setNotice(
        `Parsed ${nextPreview.summary.total} rows. Review preview before importing.`
      );
      track("profile_data_import_previewed", {
        total: nextPreview.summary.total,
        matched: nextPreview.summary.matched,
        unmatched: nextPreview.summary.unmatched,
      });
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Import preview failed.");
    } finally {
      setBuildingPreview(false);
    }
  }

  async function handleConfirmImport() {
    if (!user?.id || !preview) {
      return;
    }
    if (actionableCount === 0) {
      Alert.alert("No import actions", "There are no rows to create or update.");
      return;
    }

    setApplyingImport(true);
    setError(null);
    setNotice(null);
    try {
      const result = await applyImportPreview(user.id, preview);
      const hasErrors = result.errors.length > 0;
      const summaryMessage = [
        `Created: ${result.created}`,
        `Updated: ${result.updated}`,
        `Custom: ${result.created_custom}`,
        `Skipped: ${result.skipped}`,
        hasErrors ? `Errors: ${result.errors.length}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      Alert.alert(
        hasErrors ? "Import completed with issues" : "Import complete",
        summaryMessage
      );

      setNotice(
        hasErrors
          ? `Import finished with ${result.errors.length} row errors.`
          : "Import completed successfully."
      );

      if (hasErrors) {
        const firstError = result.errors[0];
        setError(`Row ${firstError.source_row}: ${firstError.message}`);
      } else {
        setPreview(null);
        setSelectedFileName(null);
      }

      track("profile_data_import_confirmed", {
        created: result.created,
        updated: result.updated,
        created_custom: result.created_custom,
        skipped: result.skipped,
        errors: result.errors.length,
      });
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed.");
    } finally {
      setApplyingImport(false);
    }
  }

  return (
    <PlaceholderScreen
      title="Data Export & Import"
      description="Export collection data for backup, or import CSV/JSON with figure matching."
    >
      <View className="rounded-2xl border border-hud-line/60 bg-hud-surface p-4">
        <Text className="text-sm font-space-semibold text-frost-text">Export</Text>
        <Text className="mt-2 text-xs text-secondary-text">
          Includes your collection entries and key catalog figure fields.
        </Text>
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <Button
              label="Export JSON"
              variant="secondary"
              loading={busyExport === "json"}
              onPress={() => {
                void handleExport("json");
              }}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Export CSV"
              variant="secondary"
              loading={busyExport === "csv"}
              onPress={() => {
                void handleExport("csv");
              }}
            />
          </View>
        </View>
      </View>

      <View className="rounded-2xl border border-hud-line/60 bg-hud-surface p-4">
        <Text className="text-sm font-space-semibold text-frost-text">Import</Text>
        <Text className="mt-2 text-xs text-secondary-text">
          Pick a CSV or JSON file, review matching results, then confirm import.
        </Text>
        <View className="mt-4">
          <Button
            label={buildingPreview ? "Loading file..." : "Pick Import File"}
            variant="secondary"
            loading={buildingPreview}
            onPress={() => {
              void handlePickImportFile();
            }}
          />
        </View>

        {selectedFileName ? (
          <Text className="mt-3 text-xs text-secondary-text">File: {selectedFileName}</Text>
        ) : null}

        {preview ? (
          <View className="mt-4 rounded-xl border border-hud-line/60 bg-profile-panel p-3">
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-frost-text">
              Preview Summary
            </Text>
            <Text className="mt-2 text-xs text-secondary-text">
              Total rows: {preview.summary.total} | Matched: {preview.summary.matched} |
              Unmatched: {preview.summary.unmatched}
            </Text>
            <Text className="mt-1 text-xs text-secondary-text">
              Create: {preview.summary.will_create} | Update: {preview.summary.will_update} |
              Custom: {preview.summary.will_create_custom} | Skip: {preview.summary.will_skip}
            </Text>

            <View className="mt-3 gap-2">
              {preview.rows.slice(0, 12).map((row) => (
                <View
                  key={`${row.source_row}-${row.reason}`}
                  className="rounded-lg border border-hud-line/60 bg-hud-surface px-3 py-2"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] font-space-semibold text-frost-text">
                      Row {row.source_row}: {row.figure_name ?? row.matched_figure?.name ?? "Unknown"}
                    </Text>
                    <Text className={`text-[11px] font-space-semibold ${actionTone(row.action)}`}>
                      {actionLabel(row.action)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[11px] text-secondary-text">{row.reason}</Text>
                </View>
              ))}
              {preview.rows.length > 12 ? (
                <Text className="text-[11px] text-secondary-text">
                  Showing 12 of {preview.rows.length} rows.
                </Text>
              ) : null}
            </View>

            <View className="mt-4">
              <Button
                label={applyingImport ? "Importing..." : "Confirm Import"}
                loading={applyingImport}
                disabled={actionableCount === 0}
                onPress={() => {
                  void handleConfirmImport();
                }}
                icon={<MaterialIcons name="file-upload" size={16} color="#f8fafc" />}
              />
            </View>
          </View>
        ) : null}

        {!preview && buildingPreview ? (
          <View className="mt-4 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#bae6fd" />
            <Text className="text-xs text-secondary-text">Building import preview...</Text>
          </View>
        ) : null}
      </View>

      {notice ? <Text className="text-xs text-cyan-300">{notice}</Text> : null}
      {error ? <Text className="text-xs text-danger-red">{error}</Text> : null}
    </PlaceholderScreen>
  );
}

