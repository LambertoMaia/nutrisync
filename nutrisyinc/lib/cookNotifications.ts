import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_RECUSADAS_KEY = 'cook:propostas:recusadas:seen';

export async function loadSeenRecusadasPropostas(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_RECUSADAS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(
      arr.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)),
    );
  } catch {
    return new Set();
  }
}

export async function markRecusadasPropostasSeen(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const cur = await loadSeenRecusadasPropostas();
  for (const id of ids) cur.add(id);
  await AsyncStorage.setItem(SEEN_RECUSADAS_KEY, JSON.stringify([...cur]));
}
