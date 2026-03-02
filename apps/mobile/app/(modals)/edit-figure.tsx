import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AppImage } from "../../src/components/AppImage";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { useOfflineStatus } from "../../src/offline/OfflineProvider";
import {
  applyServerDetailsUpdate,
  updateFigureDetails,
} from "../../src/offline/cache";
import { queueMutation } from "../../src/offline/queue";
import { useFigureByFigureId, useFigureById } from "../../src/offline/hooks";
import { useFigure } from "../../src/api/figures";
import { updateUserFigureDetails } from "../../src/api/user-figures";
import { useAuth } from "../../src/auth/AuthProvider";
import { supabase } from "../../src/auth/supabase";
import { track } from "../../src/observability";

type PhotoItem = {
  id: string;
  uri: string;
  ref?: string;
  source: "remote" | "local";
};

const CONDITION_OPTIONS = [
  { value: "MINT", label: "Mint" },
  { value: "OPENED", label: "Opened" },
  { value: "LOOSE", label: "Loose" },
  { value: "UNKNOWN", label: "Unknown" },
] as const;

const MAX_PHOTOS = 6;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function EditFigureModal() {
  const params = useLocalSearchParams<{
    figureId?: string;
    userFigureId?: string;
  }>();
  const { isOnline } = useOfflineStatus();
  const { user } = useAuth();

  const userFigureById = useFigureById(params.userFigureId ?? null);
  const userFigureByFigureId = useFigureByFigureId(params.figureId ?? null);
  const userFigure = userFigureById.data ?? userFigureByFigureId.data ?? null;
  const figureId = userFigure?.figureId ?? params.figureId ?? null;
  const figureQuery = useFigure(figureId);
  const figureName =
    figureQuery.data?.name ?? userFigure?.name ?? "Figure";

  const [condition, setCondition] = useState<
    (typeof CONDITION_OPTIONS)[number]["value"]
  >("UNKNOWN");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [remotePhotos, setRemotePhotos] = useState<PhotoItem[]>([]);
  const [localPhotos, setLocalPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  useEffect(() => {
    if (!userFigure) {
      return;
    }
    setCondition(userFigure.condition ?? "UNKNOWN");
    setPrice(
      userFigure.purchasePrice === null || userFigure.purchasePrice === undefined
        ? ""
        : `${userFigure.purchasePrice}`
    );
    setCurrency(userFigure.purchaseCurrency ?? "USD");
    setPurchaseDate(userFigure.purchaseDate ?? "");
    setNotes(userFigure.notes ?? "");
    setLocalPhotos([]);
  }, [userFigure?.id]);

  useEffect(() => {
    let mounted = true;
    const loadPhotos = async () => {
      if (!userFigure?.photoRefs?.length) {
        if (mounted) {
          setRemotePhotos([]);
          setLoadingPhotos(false);
        }
        return;
      }
      if (!isOnline) {
        if (mounted) {
          setRemotePhotos(
            userFigure.photoRefs.map((ref) => ({
              id: ref,
              uri: "",
              ref,
              source: "remote",
            }))
          );
          setLoadingPhotos(false);
        }
        return;
      }
      setLoadingPhotos(true);
      try {
        const signed = await Promise.all(
          userFigure.photoRefs.map(async (ref) => {
            const { data } = await supabase
              .storage
              .from("user-photos")
              .createSignedUrl(ref, 60 * 60);
            return {
              id: ref,
              uri: data?.signedUrl ?? "",
              ref,
              source: "remote" as const,
            };
          })
        );
        if (mounted) {
          setRemotePhotos(signed);
          setLoadingPhotos(false);
        }
      } catch {
        if (mounted) {
          setRemotePhotos([]);
          setLoadingPhotos(false);
        }
      }
    };
    loadPhotos().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [isOnline, userFigure?.photoRefs?.join("|")]);

  const totalPhotos = remotePhotos.length + localPhotos.length;
  const displayedPhotos = useMemo(
    () => [...remotePhotos, ...localPhotos],
    [localPhotos, remotePhotos]
  );

  const handlePickPhoto = useCallback(
    async (source: "library" | "camera") => {
      setNotice(null);
      if (!isOnline) {
        setNotice("Photos can be added when you're online.");
        return;
      }
      if (totalPhotos >= MAX_PHOTOS) {
        setNotice(`You can add up to ${MAX_PHOTOS} photos.`);
        return;
      }
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        setNotice(
          source === "camera"
            ? "Camera access is required."
            : "Photo library access is required."
        );
        return;
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            });
      if (result.canceled) {
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        return;
      }
      setLocalPhotos((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          uri: asset.uri,
          source: "local",
        },
      ]);
    },
    [isOnline, totalPhotos]
  );

  const handleRemovePhoto = useCallback((target: PhotoItem) => {
    if (target.source === "local") {
      setLocalPhotos((prev) => prev.filter((item) => item.id !== target.id));
      return;
    }
    setRemotePhotos((prev) => prev.filter((item) => item.id !== target.id));
  }, []);

  const uploadPhoto = useCallback(
    async (item: PhotoItem, userFigureId: string) => {
      if (!user?.id) {
        throw new Error("Missing user id.");
      }
      const response = await fetch(item.uri);
      const blob = await response.blob();
      const fileName = `photo-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.jpg`;
      const path = `${user.id}/${userFigureId}/${fileName}`;
      const { data, error } = await supabase.storage
        .from("user-photos")
        .upload(path, blob, {
          contentType: blob.type || "image/jpeg",
          upsert: false,
        });
      if (error || !data) {
        throw new Error(error?.message ?? "Upload failed.");
      }
      return data.path;
    },
    [user?.id]
  );

  const handleSave = useCallback(async () => {
    setNotice(null);
    if (!userFigure?.id) {
      setNotice("This figure isn't in your collection yet.");
      return;
    }
    if (purchaseDate && !DATE_REGEX.test(purchaseDate)) {
      setNotice("Purchase date must be YYYY-MM-DD.");
      return;
    }
    const trimmedPrice = price.trim();
    const parsedPrice =
      trimmedPrice.length > 0 ? Number(trimmedPrice) : null;
    if (trimmedPrice.length > 0 && Number.isNaN(parsedPrice)) {
      setNotice("Purchase price must be a number.");
      return;
    }

    const trimmedCurrency = currency.trim().toUpperCase();
    const resolvedCurrency =
      parsedPrice === null
        ? null
        : trimmedCurrency.length
          ? trimmedCurrency
          : null;
    const resolvedDate = purchaseDate.trim().length
      ? purchaseDate.trim()
      : null;
    const resolvedNotes = notes.trim().length ? notes.trim() : null;

    setSaving(true);
    track("figure_edit_saved");

    let photoRefs: string[] | null = remotePhotos
      .map((item) => item.ref)
      .filter((ref): ref is string => Boolean(ref));

    try {
      let uploadedRefs: string[] = [];
      if (localPhotos.length > 0) {
        uploadedRefs = await Promise.all(
          localPhotos.map((item) => uploadPhoto(item, userFigure.id))
        );
      }
      photoRefs =
        photoRefs.length || uploadedRefs.length
          ? [...photoRefs, ...uploadedRefs]
          : null;

      const optimisticUpdatedAt = new Date().toISOString();
      await updateFigureDetails(userFigure.id, {
        condition,
        purchasePrice: parsedPrice ?? null,
        purchaseCurrency: resolvedCurrency,
        purchaseDate: resolvedDate,
        notes: resolvedNotes,
        photoRefs,
        updatedAt: optimisticUpdatedAt,
        syncPending: !isOnline,
      });

      if (!isOnline) {
        await queueMutation({
          type: "details_update",
          entityId: userFigure.id,
          payload: {
            condition,
            purchasePrice: parsedPrice ?? null,
            purchaseCurrency: resolvedCurrency,
            purchaseDate: resolvedDate,
            notes: resolvedNotes,
            photoRefs,
            updatedAt: optimisticUpdatedAt,
          },
        });
        setSaving(false);
        router.back();
        return;
      }

      const response = await updateUserFigureDetails(userFigure.id, {
        condition,
        purchase_price: parsedPrice ?? null,
        purchase_currency: resolvedCurrency,
        purchase_date: resolvedDate,
        notes: resolvedNotes,
        photo_refs: photoRefs,
      });

      await applyServerDetailsUpdate(userFigure.id, {
        condition: response.condition ?? condition,
        purchasePrice:
          response.purchase_price ?? parsedPrice ?? null,
        purchaseCurrency:
          response.purchase_currency ?? resolvedCurrency,
        purchaseDate: response.purchase_date ?? resolvedDate,
        notes: response.notes ?? resolvedNotes,
        photoRefs: response.photo_refs ?? photoRefs,
        updatedAt: response.updated_at ?? optimisticUpdatedAt,
      });
      setLocalPhotos([]);
      setSaving(false);
      router.back();
    } catch (error) {
      await updateFigureDetails(userFigure.id, {
        condition,
        purchasePrice: parsedPrice ?? null,
        purchaseCurrency: resolvedCurrency,
        purchaseDate: resolvedDate,
        notes: resolvedNotes,
        photoRefs,
        syncPending: true,
      });
      await queueMutation({
        type: "details_update",
        entityId: userFigure.id,
        payload: {
          condition,
          purchasePrice: parsedPrice ?? null,
          purchaseCurrency: resolvedCurrency,
          purchaseDate: resolvedDate,
          notes: resolvedNotes,
          photoRefs,
          updatedAt: new Date().toISOString(),
        },
      });
      setSaving(false);
      setNotice(
        error instanceof Error ? error.message : "Save failed. Try again."
      );
    }
  }, [
    condition,
    currency,
    isOnline,
    localPhotos,
    notes,
    price,
    purchaseDate,
    remotePhotos,
    uploadPhoto,
    userFigure?.id,
  ]);

  return (
    <View className="flex-1 bg-void">
      <ScreenHeader
        title="Edit Figure"
        subtitle={figureName}
        rightSlot={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close edit figure"
          >
            <MaterialIcons name="close" size={20} color="#94a3b8" />
          </Pressable>
        }
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {notice ? (
          <View className="mb-4 rounded-xl border border-danger-red/60 bg-danger-red/15 px-3 py-2">
            <Text className="text-xs font-space-medium text-danger-red">
              {notice}
            </Text>
          </View>
        ) : null}

        <View className="gap-4">
          <Card className="gap-4">
            <View className="gap-2">
              <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                Purchase Price
              </Text>
              <View className="flex-row gap-3">
                <TextInput
                  style={[styles.input, styles.flexGrow]}
                  placeholder="0.00"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />
                <TextInput
                  style={[styles.input, styles.currency]}
                  placeholder="USD"
                  placeholderTextColor="#64748b"
                  value={currency}
                  onChangeText={setCurrency}
                  autoCapitalize="characters"
                  maxLength={4}
                />
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                Purchase Date
              </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748b"
                value={purchaseDate}
                onChangeText={setPurchaseDate}
              />
            </View>

            <View className="gap-2">
              <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                Condition
              </Text>
              <View className="flex-row rounded-2xl border border-hud-line/60 bg-hud-surface p-1">
                {CONDITION_OPTIONS.map((option) => {
                  const selected = condition === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setCondition(option.value)}
                      className={`flex-1 rounded-xl px-2 py-2 ${
                        selected ? "bg-royal-blue/25" : ""
                      }`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${option.label} condition`}
                    >
                      <Text
                        className={`text-center text-[11px] font-space-semibold ${
                          selected ? "text-frost-text" : "text-secondary-text"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

          <Card className="gap-2">
            <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
              Notes
            </Text>
            <TextInput
              style={[styles.input, styles.notes]}
              placeholder="Add your observations, where you found it, or what you paid."
              placeholderTextColor="#64748b"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </Card>

          <Card className="gap-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] font-space-semibold uppercase tracking-widest text-secondary-text">
                  Photos
                </Text>
                <Text className="text-xs text-muted-text">
                  Up to {MAX_PHOTOS} photos
                </Text>
              </View>
              <Text className="text-xs text-muted-text">
                {totalPhotos}/{MAX_PHOTOS}
              </Text>
            </View>
            {displayedPhotos.length === 0 ? (
              <View className="items-center justify-center rounded-2xl border border-dashed border-hud-line/60 py-8">
                <MaterialIcons name="photo" size={24} color="#64748b" />
                <Text className="mt-2 text-xs text-muted-text">
                  No photos added yet.
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {displayedPhotos.map((photo) => (
                  <View key={photo.id} className="relative">
                    {photo.uri ? (
                      <AppImage
                        uri={photo.uri}
                        style={{ height: 80, width: 80, borderRadius: 12 }}
                        variant="thumbnail"
                        accessibilityLabel="Figure photo"
                      />
                    ) : (
                      <View className="h-20 w-20 items-center justify-center rounded-xl border border-hud-line/60 bg-hud-surface">
                        <MaterialIcons name="image" size={20} color="#64748b" />
                      </View>
                    )}
                    <Pressable
                      onPress={() => handleRemovePhoto(photo)}
                      className="absolute -right-2 -top-2 rounded-full bg-danger-red p-1"
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                    >
                      <MaterialIcons name="close" size={12} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {loadingPhotos ? (
              <Text className="text-xs text-muted-text">
                Loading photos...
              </Text>
            ) : null}
            {!isOnline ? (
              <Text className="text-xs text-action-blue">
                Photo uploads require an internet connection.
              </Text>
            ) : null}
            <View className="flex-row gap-3">
              <Button
                label="Add from Library"
                variant="secondary"
                icon={<MaterialIcons name="photo-library" size={16} color="#f8fafc" />}
                onPress={() => handlePickPhoto("library")}
                disabled={saving}
              />
              <Button
                label="Use Camera"
                variant="secondary"
                icon={<MaterialIcons name="photo-camera" size={16} color="#f8fafc" />}
                onPress={() => handlePickPhoto("camera")}
                disabled={saving}
              />
            </View>
          </Card>

          {userFigure?.syncPending ? (
            <View className="rounded-xl border border-action-blue/30 bg-action-blue/10 px-3 py-2">
              <Text className="text-xs text-action-blue">
                Sync pending when you are online.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="border-t border-hud-line/60 bg-void px-4 py-4">
        <Button
          label={saving ? "Saving..." : "Save Changes"}
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 14,
  },
  flexGrow: {
    flex: 1,
  },
  currency: {
    width: 80,
    textTransform: "uppercase",
    textAlign: "center",
  },
  notes: {
    minHeight: 120,
    textAlignVertical: "top",
  },
});
