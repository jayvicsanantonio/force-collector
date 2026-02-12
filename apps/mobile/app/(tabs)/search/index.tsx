import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  Camera,
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import { Button } from "../../../src/components/Button";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { track } from "../../../src/observability";
import { useScanLookup } from "../../../src/api/scan";

type ScanState =
  | "requesting"
  | "permission-denied"
  | "scanning"
  | "detected"
  | "processing"
  | "no-match"
  | "error";

const BARCODE_LENGTHS = new Set([8, 12, 13, 14]);

export default function ScannerScreen() {
  const { accentTextClass, accentBorderClass } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const scanLookup = useScanLookup();
  const [scanState, setScanState] = useState<ScanState>("requesting");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const processingRef = useRef(false);
  const scanLine = useRef(new Animated.Value(0)).current;

  const permissionGranted = permission?.granted === true;
  const canScan = permissionGranted && scanState === "scanning";

  useEffect(() => {
    track("scanner_viewed");
  }, []);

  useEffect(() => {
    if (!permission) {
      return;
    }
    if (permission.granted) {
      setScanState((prev) =>
        prev === "requesting" || prev === "permission-denied"
          ? "scanning"
          : prev
      );
    } else {
      setScanState(permission.canAskAgain ? "requesting" : "permission-denied");
    }
  }, [permission]);

  useEffect(() => {
    let active = true;
    const cameraApi = Camera as unknown as {
      getAvailableCameraDevicesAsync?: () => Promise<
        Array<{
          position?: string;
          hasTorch?: boolean;
          hasFlash?: boolean;
        }>
      >;
    };
    const loadTorch = async () => {
      if (!cameraApi.getAvailableCameraDevicesAsync) {
        return;
      }
      try {
        const devices = await cameraApi.getAvailableCameraDevicesAsync();
        if (!active) {
          return;
        }
        const back = devices.find((device) => device.position === "back");
        setTorchAvailable(Boolean(back?.hasTorch ?? back?.hasFlash));
      } catch {
        if (active) {
          setTorchAvailable(false);
        }
      }
    };
    loadTorch();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (scanState !== "scanning") {
      scanLine.stopAnimation();
      return;
    }
    scanLine.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [scanLine, scanState]);

  const instructionText = useMemo(() => {
    if (scanState === "processing") {
      return "Processing scan...";
    }
    if (scanState === "detected") {
      return "Barcode detected. Stabilizing scan...";
    }
    if (scanState === "no-match") {
      return "No match found. Try scanning again or enter the code manually.";
    }
    if (scanState === "error") {
      return lookupError ?? "Scan lookup failed. Try again.";
    }
    if (scanState === "permission-denied") {
      return "Camera access is denied. You can still enter the code manually.";
    }
    if (!permissionGranted) {
      return "Allow camera access to scan barcodes instantly.";
    }
    return "Align the barcode within the frame to scan.";
  }, [lookupError, permissionGranted, scanState]);

  const handleRequestPermission = async () => {
    const response = await requestPermission();
    if (response.granted) {
      track("scanner_permission_granted");
      setScanState("scanning");
    } else {
      track("scanner_permission_denied");
      setScanState("permission-denied");
    }
  };

  const performLookup = async (
    barcode: string,
    symbology?: string,
    source: "camera" | "manual" = "camera"
  ) => {
    setLookupError(null);
    setScanState("processing");
    try {
      const response = await scanLookup.mutateAsync({
        barcode,
        symbology,
      });
      if (!response.match) {
        track("scan_lookup_no_match", { source });
        setScanState("no-match");
        processingRef.current = false;
        return;
      }
      track("scan_lookup_success", { source });
      router.push({
        pathname: "/search/results",
        params: {
          payload: JSON.stringify(response),
        },
      });
    } catch (error) {
      track("scan_lookup_failure", { source });
      setLookupError("Lookup failed. Check your connection and retry.");
      setScanState("error");
      processingRef.current = false;
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (processingRef.current || !canScan) {
      return;
    }
    processingRef.current = true;
    setScanState("detected");
    setScanCount((count) => count + 1);
    track("scan_detected");
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {
      // Haptics are best-effort.
    });
    void performLookup(result.data, result.type, "camera");
  };

  const handleRetryScan = () => {
    processingRef.current = false;
    setLookupError(null);
    if (permissionGranted) {
      setScanState("scanning");
    } else {
      setScanState(permission?.canAskAgain ? "requesting" : "permission-denied");
    }
  };

  const handleManualSubmit = () => {
    const normalized = manualCode.replace(/\D/g, "");
    if (!BARCODE_LENGTHS.has(normalized.length)) {
      setManualError("Enter a valid UPC/EAN (8, 12, 13, or 14 digits).");
      return;
    }
    setManualError(null);
    setManualVisible(false);
    setManualCode(normalized);
    void performLookup(normalized, undefined, "manual");
  };

  const scanLineTranslate = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 110],
  });

  return (
    <View className="flex-1 bg-void">
      <View className="flex-1 bg-camera-deep">
        {permissionGranted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={torchEnabled}
            onBarcodeScanned={canScan ? handleBarcodeScanned : undefined}
            barcodeScannerSettings={{
              barcodeTypes: ["upc_a", "upc_e", "ean8", "ean13"],
            }}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-camera-deep px-6">
            <Text className="text-center text-sm text-secondary-text">
              Enable camera access to scan barcodes faster.
            </Text>
          </View>
        )}

        <View className="absolute inset-0">
          <SafeAreaView edges={["top"]} className="px-4">
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => router.back()}
                className="h-10 w-10 items-center justify-center rounded-full bg-overlay-ink/80"
              >
                <MaterialIcons name="close" size={20} color="#e2e8f0" />
              </Pressable>
              <View className="rounded-full border border-hud-line/70 bg-overlay-ink/70 px-3 py-1">
                <Text
                  className={`text-[10px] font-space-semibold uppercase tracking-[2px] ${accentTextClass}`}
                >
                  System Active
                </Text>
              </View>
              {torchAvailable && permissionGranted ? (
                <Pressable
                  onPress={() => {
                    setTorchEnabled((prev) => !prev);
                    track("scanner_flash_toggled");
                  }}
                  className="h-10 w-10 items-center justify-center rounded-full bg-overlay-ink/80"
                  accessibilityLabel="Toggle flashlight"
                >
                  <MaterialIcons
                    name={torchEnabled ? "flash-on" : "flash-off"}
                    size={20}
                    color={torchEnabled ? "#38bdf8" : "#cbd5f5"}
                  />
                </Pressable>
              ) : (
                <View className="h-10 w-10" />
              )}
            </View>
          </SafeAreaView>

          <View className="flex-1 items-center justify-center">
            <View className="items-center">
              <View
                className={`h-[260px] w-[260px] rounded-3xl border-2 ${accentBorderClass} bg-black/20`}
              >
                <View className="absolute inset-0 rounded-3xl border border-white/10" />
                {scanState === "scanning" ? (
                  <Animated.View
                    style={[
                      styles.scanLine,
                      { transform: [{ translateY: scanLineTranslate }] },
                    ]}
                  />
                ) : null}
              </View>
            </View>
          </View>

          <View className="px-6 pb-6">
            <Text className="text-center text-sm text-frost-text">
              {instructionText}
            </Text>

            {scanState === "permission-denied" ? (
              <View className="mt-4 gap-3">
                <Button
                  label="Open Settings"
                  onPress={() => {
                    void Linking.openSettings();
                  }}
                />
                <Button
                  label="Enter Code Manually"
                  variant="secondary"
                  onPress={() => setManualVisible(true)}
                />
              </View>
            ) : !permissionGranted ? (
              <View className="mt-4 gap-3">
                <Button
                  label="Enable Camera"
                  onPress={() => {
                    void handleRequestPermission();
                  }}
                />
                <Button
                  label="Enter Code Manually"
                  variant="secondary"
                  onPress={() => setManualVisible(true)}
                />
              </View>
            ) : scanState === "no-match" || scanState === "error" ? (
              <View className="mt-4 gap-3">
                <Button label="Try Scan Again" onPress={handleRetryScan} />
                <Button
                  label="Enter Code Manually"
                  variant="secondary"
                  onPress={() => setManualVisible(true)}
                />
                <Button
                  label="Create Custom Entry"
                  variant="ghost"
                  onPress={() => router.push("/add-figure")}
                />
              </View>
            ) : (
              <View className="mt-4">
                <Button
                  label="Enter Code Manually"
                  variant="secondary"
                  onPress={() => setManualVisible(true)}
                />
              </View>
            )}

            <View className="mt-5 items-center">
              <Text className="text-xs uppercase tracking-[2px] text-muted-text">
                Session Scans: {scanCount}
              </Text>
            </View>
          </View>
        </View>

        {scanState === "processing" ? (
          <View className="absolute inset-0 items-center justify-center bg-black/70">
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text className="mt-3 text-sm text-frost-text">
              Looking up barcode...
            </Text>
          </View>
        ) : null}
      </View>

      <Modal
        visible={manualVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View className="rounded-t-3xl border border-hud-line/70 bg-hud-surface px-5 pb-8 pt-6">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-space-semibold text-frost-text">
                  Enter Barcode
                </Text>
                <Pressable onPress={() => setManualVisible(false)}>
                  <MaterialIcons name="close" size={20} color="#94a3b8" />
                </Pressable>
              </View>
              <Text className="mt-2 text-xs text-secondary-text">
                UPC/EAN codes are 8, 12, 13, or 14 digits long.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="012345678905"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                value={manualCode}
                onChangeText={setManualCode}
              />
              {manualError ? (
                <Text className="mt-2 text-xs text-danger-red">
                  {manualError}
                </Text>
              ) : null}
              <View className="mt-5 gap-3">
                <Button
                  label="Lookup Barcode"
                  loading={scanLookup.isPending}
                  onPress={() => {
                    handleManualSubmit();
                  }}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setManualVisible(false)}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scanLine: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: "rgba(56,189,248,0.9)",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  input: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(30,58,138,0.6)",
    backgroundColor: "#0b1220",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f8fafc",
    fontSize: 15,
  },
});
