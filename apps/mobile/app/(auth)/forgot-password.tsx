import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../../src/components/Button";
import { AuthScreenShell } from "../../src/auth/AuthScreenShell";
import { useAuth } from "../../src/auth/AuthProvider";
import { track } from "../../src/observability";

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      track("auth_password_reset_requested");
      setNotice("Password reset email sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset email.");
      track("auth_password_reset_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      title="Reset Password"
      subtitle="We'll send a secure reset link to your email."
      footer={
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-secondary-text">Remembered it?</Text>
          <Pressable
            onPress={() => {
              track("auth_sign_in_from_reset");
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
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        <Button label="Send Reset Link" loading={loading} onPress={handleReset} />
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
