import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../../src/components/Button";
import { AuthScreenShell } from "../../src/auth/AuthScreenShell";
import { useAuth } from "../../src/auth/AuthProvider";
import { track } from "../../src/observability";

export default function SignInScreen() {
  const { status, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signedIn") {
      router.replace("/home");
    }
  }, [status]);

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      track("auth_sign_in_success");
      router.replace("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      track("auth_sign_in_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      title="Sign In"
      subtitle="Access your collection and synced data."
      footer={
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-secondary-text">New here?</Text>
          <Pressable
            onPress={() => {
              track("auth_create_account_from_sign_in");
              router.replace("/(auth)/create-account");
            }}
          >
            <Text className="text-xs font-space-semibold uppercase tracking-widest text-electric-cyan">
              Create Account
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
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button label="Sign In" loading={loading} onPress={handleSignIn} />
        <Pressable
          style={styles.linkRow}
          onPress={() => {
            track("auth_forgot_password_from_sign_in");
            router.push("/(auth)/forgot-password");
          }}
        >
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
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
  linkRow: {
    alignItems: "center",
  },
  linkText: {
    color: "#22d3ee",
    fontSize: 12,
    fontWeight: "600",
  },
});
