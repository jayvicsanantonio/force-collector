import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../../src/components/Button";
import { AuthScreenShell } from "../../src/auth/AuthScreenShell";
import { useAuth } from "../../src/auth/AuthProvider";
import { track } from "../../src/observability";

export default function CreateAccountScreen() {
  const { status, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signedIn") {
      router.replace("/home");
    }
  }, [status]);

  const handleCreateAccount = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password);
      track("auth_sign_up_success");
      setNotice("Check your inbox to confirm your account.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
      track("auth_sign_up_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      title="Create Account"
      subtitle="Start tracking your collection across devices."
      footer={
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-secondary-text">Already have an account?</Text>
          <Pressable
            onPress={() => {
              track("auth_sign_in_from_create_account");
              router.replace("/(auth)/sign-in");
            }}
          >
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-electric-cyan">
              Sign In
            </Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="pilot@rebellion.io"
          placeholderTextColor="#64748b"
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
        />
        <Text style={[styles.label, styles.spacingTop]}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Create a secure password"
          placeholderTextColor="#64748b"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        <Button
          label="Create Account"
          loading={loading}
          onPress={handleCreateAccount}
        />
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(30,58,138,0.6)",
    gap: 12,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#94a3b8",
    fontWeight: "600",
  },
  spacingTop: {
    marginTop: 4,
  },
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 14,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
  },
  noticeText: {
    color: "#22d3ee",
    fontSize: 12,
  },
});
