import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "../../../src/components/Button";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { useAuth } from "../../../src/auth/AuthProvider";
import { supabase } from "../../../src/auth/supabase";
import { track } from "../../../src/observability";

export default function AccountScreen() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  const providers = useMemo(() => {
    const metadata = user?.app_metadata as { provider?: string; providers?: string[] } | undefined;
    if (!metadata) {
      return [];
    }
    if (Array.isArray(metadata.providers) && metadata.providers.length > 0) {
      return metadata.providers;
    }
    if (metadata.provider) {
      return [metadata.provider];
    }
    return [];
  }, [user?.app_metadata]);

  const handleUpdateEmail = async () => {
    setNotice(null);
    setError(null);
    if (!email.trim()) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: email.trim(),
      });
      if (updateError) {
        throw updateError;
      }
      setNotice("Check your inbox to confirm the new email.");
      track("profile_email_update_requested");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PlaceholderScreen
      title="Account Details"
      description="Manage your email, connected providers, and data access."
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="pilot@rebellion.io"
          placeholderTextColor="#64748b"
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button label="Update Email" loading={loading} onPress={handleUpdateEmail} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connected Providers</Text>
        {providers.length > 0 ? (
          <View style={styles.providerList}>
            {providers.map((provider) => (
              <View key={provider} style={styles.providerChip}>
                <Text style={styles.providerText}>{provider}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.cardText}>Email/password only.</Text>
        )}
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#101a2a",
    borderWidth: 1,
    borderColor: "#22324d",
    gap: 12,
  },
  cardTitle: {
    color: "#a7c4ff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardText: {
    color: "#e6f0ff",
    fontSize: 13,
  },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 14,
  },
  noticeText: {
    color: "#22d3ee",
    fontSize: 12,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
  },
  providerList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  providerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#22324d",
    backgroundColor: "#0f1826",
  },
  providerText: {
    color: "#e6f0ff",
    fontSize: 12,
    fontWeight: "600",
  },
});
