import { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { supabase } from "../lib/supabase";

function code6() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:6},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join("");
}

export default function Lobby({ navigation }: any) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  async function createMatch() {
    const matchId = code6();
    const seed = Math.floor(Math.random()*2**31);
    const channel = supabase.channel(`match_${matchId}`, { config: { broadcast: { self: true } }});
    await channel.subscribe();
    // host announces lobby open with seed
    await channel.send({ type: "broadcast", event: "lobby", payload: { seed } });
    navigation.navigate("Match", { matchId, seed, isHost: true, name: name || "Host" });
  }

  async function joinMatch() {
    if (!code) return Alert.alert("Enter code");
    const matchId = code.toUpperCase();
    const channel = supabase.channel(`match_${matchId}`, { config: { broadcast: { self: true } }});
    let seed: number | null = null;
    channel.on("broadcast", { event: "lobby" }, (msg) => { seed = msg.payload.seed; });
    await channel.subscribe();
    // ping host in case they didn’t broadcast recently
    await channel.send({ type: "broadcast", event: "hello", payload: { hi: true } });
    // wait briefly to receive seed
    setTimeout(() => {
      if (seed == null) Alert.alert("Couldn’t find match. Check code.");
      else navigation.navigate("Match", { matchId, seed, isHost: false, name: name || "Guest" });
    }, 500);
  }

  return (
    <View style={{ flex:1, justifyContent:"center", padding:20, gap:12 }}>
      <Text style={{ fontSize:24, fontWeight:"700" }}>MathRift</Text>
      <TextInput placeholder="Your name" value={name} onChangeText={setName}
        style={{ borderWidth:1, borderRadius:8, padding:10 }}/>
      <Button title="Create match" onPress={createMatch} />
      <View style={{ height:16 }}/>
      <TextInput placeholder="Enter match code" value={code} onChangeText={t=>setCode(t.toUpperCase())}
        autoCapitalize="characters" style={{ borderWidth:1, borderRadius:8, padding:10 }}/>
      <Button title="Join match" onPress={joinMatch} />
    </View>
  );
}
