import baseConfig from "./app.json";

const { expo, ...rest } = baseConfig;

export default {
  ...rest,
  expo: {
    ...expo,
    name: "MathRift",
    slug: "mathrift",
    extra: {
      ...expo?.extra,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    }
  }
};
