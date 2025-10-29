import { useState } from "react";
import { StyleSheet, Text, TextInput, View, Button } from "react-native";
import { genQuestion, verifyAnswer } from "@mathrift/math-engine";

const seed = 987654321; // later we’ll get this from backend

export default function App() {
  const [round, setRound] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const q = genQuestion(seed, round);

  function submit() {
    const verdict = verifyAnswer(seed, round, input);
    setResult(verdict.ok ? "✅ Correct" : `❌ Expected: ${verdict.canonical}`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>MathRift Duel (Local)</Text>
      <Text style={styles.prompt}>{q.prompt}</Text>
      <TextInput
        style={styles.input}
        placeholder="Your answer"
        value={input}
        onChangeText={setInput}
      />
      <Button title="Submit" onPress={submit} />
      <Text style={styles.result}>{result}</Text>
      <Button title="Next Round" onPress={() => { setRound(r => r + 1); setInput(""); setResult(""); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  prompt: { fontSize: 18, marginVertical: 12 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 10 },
  result: { marginVertical: 8, fontSize: 16 }
});
