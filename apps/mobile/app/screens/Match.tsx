import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { supabase } from "../lib/supabase";
import { genQuestion, verifyAnswer } from "@mathrift/math-engine";

type Props = { route: any, navigation: any };

export default function Match({ route }: Props) {
  const { matchId, seed, isHost, name } = route.params as { matchId: string; seed: number; isHost: boolean; name: string; };
  const [round, setRound] = useState(0);
  const [endsAt, setEndsAt] = useState<number>(0);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string>("waiting");
  const [score, setScore] = useState<{me:number; them:number}>({me:0, them:0});
  const [winner, setWinner] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myId = useRef<string>(Math.random().toString(36).slice(2));

  const q = useMemo(() => genQuestion(seed, round), [seed, round]);

  useEffect(() => {
    const channel = supabase.channel(`match_${matchId}`, { config: { broadcast: { self: false } }});
    channel.on("broadcast", { event: "round.start" }, (msg) => {
      setRound(msg.payload.round);
      setEndsAt(msg.payload.endsAt);
      setInput("");
      setStatus("racing");
      setWinner(null);
    });
    channel.on("broadcast", { event: "round.result" }, (msg) => {
      setWinner(msg.payload.winnerName);
      if (msg.payload.winnerId === myId.current) setScore(s => ({...s, me: s.me + 1}));
      else setScore(s => ({...s, them: s.them + 1}));
      setStatus("result");
    });
    channel.subscribe();
    channelRef.current = channel;

    // if host, start round 0
    if (isHost) {
      setTimeout(() => startRound(0), 200);
    }
    return () => { channel.unsubscribe(); };
  }, []);

  async function startRound(r: number) {
    const durMs = 15000; // 15s per round
    const now = Date.now();
    const ea = now + durMs;
    setEndsAt(ea);
    setStatus("racing");
    setWinner(null);
    await channelRef.current?.send({
      type: "broadcast",
      event: "round.start",
      payload: { round: r, endsAt: ea }
    });
  }

  async function submit() {
    if (status !== "racing") return;
    const v = verifyAnswer(seed, round, input);
    if (!v.ok) { setStatus("nope"); return; }
    // host accepts first correct and announces result
    if (isHost) {
      await channelRef.current?.send({
        type: "broadcast",
        event: "round.result",
        payload: { round, winnerId: myId.current, winnerName: name, canonical: v.canonical }
      });
      setScore(s => ({...s, me: s.me + 1}));
      setStatus("result");
    } else {
      // guests ping host; host should be submitting on their own device too
      await channelRef.current?.send({
        type: "broadcast",
        event: "answer",
        payload: { round, from: name }
      });
      setStatus("waiting");
    }
  }

  function nextRound() {
    if (!isHost) return;
    startRound(round + 1);
  }

  return (
    <View style={{ flex:1, padding:20, gap:12 }}>
      <Text style={{ fontSize:20, fontWeight:"700" }}>
        Match {matchId} • Seed {seed}
      </Text>
      <Text>Score: You {score.me} — {score.them} Opp</Text>
      <View style={{ padding:12, backgroundColor:"#eee", borderRadius:12 }}>
        <Text style={{ fontSize:18 }}>{q.prompt}</Text>
      </View>
      <Text>Round ends in: {Math.max(0, Math.ceil((endsAt - Date.now())/1000))}s</Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Your answer"
        style={{ borderWidth:1, borderRadius:8, padding:10 }}
        autoCapitalize="none"
      />
      <Button title="Submit" onPress={submit} />
      <Text>{status === "nope" ? "Not quite" : status === "result" && winner ? `Point: ${winner}` : ""}</Text>
      {isHost && <Button title="Next Round" onPress={nextRound} />}
    </View>
  );
}
